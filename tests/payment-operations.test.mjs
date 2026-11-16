import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

function worker(env,args){
  return new Promise(resolve=>{const child=spawn(process.execPath,['tests/phase1a-worker.mjs',...args],{env,cwd:process.cwd()});let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);child.on('close',()=>resolve(JSON.parse(output.trim().split('\n').pop())))});
}

test('phase1d payment operations and reconciliation management',{skip:process.env.PHASE1A_TEST_DB!=='1'},async()=>{
 const mysql=(await import('mysql2/promise')).default;
 const {TestPaymentGateway,registerGateway}=await import('../lib/payments/gateways.ts');
 const {createPaymentIntent,settlePayment,refundPaymentAllocations,reconcilePaymentInitiation,sweepPaymentLeases,listReconciliationCases,getReconciliationCase,claimReconciliationCase,resolveReconciliationCase,escalateReconciliationCase}=await import('../lib/payments/service.ts');
 const {pool}=await import('../lib/db.ts');
 const db=mysql.createPool({host:'localhost',port:3306,user:'root',password:'',database:'phase1a_test',ssl:false});
 const key=Date.now();let gateway;
 const WORKER_KEY=`phase1e-worker-${key}`;const WORKER_SECRET=`phase1e-secret-${key}`;const workerAuth={workerKey:WORKER_KEY,workerSecret:WORKER_SECRET};
 const env={...process.env,PHASE1A_TEST_DB:'1',MYSQL_DATABASE:'phase1a_test',MYSQL_HOST:'localhost',MYSQL_PORT:'3306',MYSQL_USER:'root',MYSQL_PASSWORD:'',JWT_SECRET:'0123456789abcdef0123456789abcdef',RECOVERY_WORKER_KEY:WORKER_KEY,RECOVERY_WORKER_SECRET:WORKER_SECRET};
 async function member(name,admin=0){const [r]=await db.query("INSERT INTO users(name,email,password,user_category,role,is_admin,is_approved,created_at,updated_at) VALUES(?,?,'hash','regular',?,?,1,NOW(),NOW())",[name,`phase1d.${name.toLowerCase()}.${key}.${Math.random()}@example.invalid`,admin?'finance_admin':'member',admin]);return r.insertId}
 async function paidMember(name,cycles=[2026]){const id=await member(name);gateway.initiationOutcome='accept';const intent=await createPaymentIntent({actingUserId:id,providerCode:'test-gateway',cycleYears:cycles,idempotencyKey:`p1d-${name}-${key}`});const [alloc]=await db.query('SELECT id,amount FROM payment_cycle_allocations WHERE payment_id=? ORDER BY cycle_year',[intent.payment.id]);const amount=alloc.reduce((s,x)=>s+Number(x.amount),0);gateway.responses.set(intent.payment.reference,{providerReference:intent.payment.reference,providerTransactionId:`txn-${name}-${key}`,state:'SUCCESS',amount,currency:'TZS',memberReference:intent.payment.reference});assert.equal((await settlePayment(intent.payment.id,'test')).status,'SUCCESS');return{memberId:id,paymentId:intent.payment.id,reference:intent.payment.reference,allocationId:alloc[0].id,allocations:alloc,amount}}
 try{
   const [[dn]]=await db.query('SELECT DATABASE() db');assert.equal(dn.db,'phase1a_test');
   gateway=new TestPaymentGateway();registerGateway(gateway);
   const admin=await member('FinanceAdmin',1);
   const admin2=await member('FinanceAdmin2',1);
   const memberId=await member('Ordinary');
   const [ordinaryAdminRow]=await db.query("INSERT INTO users(name,email,password,user_category,role,is_admin,is_approved,created_at,updated_at) VALUES('OrdinaryAdmin',?,'hash','regular','admin',1,1,NOW(),NOW())",[`ordinary.admin.${key}@example.invalid`]);const ordinaryAdmin=ordinaryAdminRow.insertId;
   await db.query('INSERT INTO payment_recovery_workers(worker_key,secret_hash,is_active) VALUES(?,?,1)',[WORKER_KEY,createHash('sha256').update(WORKER_SECRET).digest('hex')]);

   gateway.initiationOutcome='timeout-after-accept';
   const initMember=await member('InitRecovery');
   await assert.rejects(createPaymentIntent({actingUserId:initMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`init-sweep-${key}`}),/timeout/);
   const [[initPayment]]=await db.query('SELECT id,reference FROM payment_transactions WHERE user_id=?',[initMember]);
   await db.query("UPDATE payment_initiation_attempts SET status='PENDING_PROVIDER',lease_expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND),next_attempt_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE payment_id=?",[initPayment.id]);
   const [s1,s2]=await Promise.all([worker(env,['sweep-init',initPayment.id,initPayment.reference,'40000',`worker-a-${key}`]),worker(env,['sweep-init',initPayment.id,initPayment.reference,'40000',`worker-b-${key}`])]);
   assert.equal(s1.ok,true);assert.equal(s2.ok,true);assert.equal(s1.result.initiationRecovered+s2.result.initiationRecovered,1);assert.ok(s1.result.claimConflicts+s2.result.claimConflicts<=1);assert.ok(s1.result.initiationAttempts+s2.result.initiationAttempts>=1);
   const [[initAttempt]]=await db.query('SELECT status,retry_count FROM payment_initiation_attempts WHERE payment_id=?',[initPayment.id]);
   const [[initState]]=await db.query('SELECT status FROM payment_transactions WHERE id=?',[initPayment.id]);
   assert.equal(initAttempt.status,'PROVIDER_ACCEPTED');assert.equal(initState.status,'PROCESSING');assert.equal(gateway.initiationCalls,1);
   assert.equal((await sweepPaymentLeases({...workerAuth,workerId:`repeat-init-${key}`,paymentId:initPayment.id})).initiationAttempts,0);

   const uncertain=await paidMember('RefundUncertain');
   gateway.initiateRefund=async()=>{throw new Error('Synthetic refund timeout')};
   await assert.rejects(refundPaymentAllocations({paymentId:uncertain.paymentId,allocationIds:[uncertain.allocationId],amount:uncertain.amount,reason:'uncertain refund',actorId:admin,actorType:'admin'}),/timeout/);
   const [[request]]=await db.query('SELECT id,status,provider_refund_reference FROM payment_refund_requests WHERE payment_id=?',[uncertain.paymentId]);
   assert.equal(request.status,'RECONCILIATION_REQUIRED');assert.equal(request.provider_refund_reference,null);
   const [[refundCase]]=await db.query("SELECT id,status,subject_type,subject_id FROM payment_reconciliation_cases WHERE payment_id=? AND case_type='REFUND_PROVIDER_RECOVERY_REQUIRED'",[uncertain.paymentId]);
   assert.equal(refundCase.status,'OPEN');assert.equal(refundCase.subject_type,'REFUND_REQUEST');assert.equal(Number(refundCase.subject_id),Number(request.id));
   const blockedSweep=await sweepPaymentLeases({...workerAuth,workerId:`blocked-${key}`,refundRequestId:request.id});
   assert.equal(blockedSweep.initiationAttempts,0);assert.equal(blockedSweep.refundAttempts,0);assert.equal(gateway.refundInitiations,0);

   const refundAuditFail=await paidMember('RefundAuditFail');gateway.initiateRefund=async()=>{throw new Error('Synthetic refund audit-boundary failure')};
   await db.query('CREATE TRIGGER phase1e_refund_audit_fail BEFORE INSERT ON payment_audit_events FOR EACH ROW BEGIN IF NEW.event_type="REFUND_RECONCILIATION_REQUIRED" THEN SIGNAL SQLSTATE "45000" SET MESSAGE_TEXT="forced refund audit failure"; END IF; END');
   try{await assert.rejects(refundPaymentAllocations({paymentId:refundAuditFail.paymentId,allocationIds:[refundAuditFail.allocationId],amount:refundAuditFail.amount,reason:'audit failure',actorId:admin,actorType:'admin'}),/forced refund audit failure/)}finally{await db.query('DROP TRIGGER phase1e_refund_audit_fail')}
   const [[refundAuditState]]=await db.query('SELECT status,next_attempt_at,last_error FROM payment_refund_requests WHERE payment_id=?',[refundAuditFail.paymentId]);assert.equal(refundAuditState.status,'PENDING_PROVIDER');assert.equal(refundAuditState.next_attempt_at,null);assert.equal(refundAuditState.last_error,null);

   const repeat=await paidMember('RepeatedCase',[2026,2027]);
   gateway.initiateRefund=async()=>{throw new Error('Synthetic repeated refund uncertainty')};
   for(const allocation of repeat.allocations)await assert.rejects(refundPaymentAllocations({paymentId:repeat.paymentId,allocationIds:[allocation.id],amount:Number(allocation.amount),reason:'repeat case',actorId:admin,actorType:'admin'}),/uncertainty/);
   const [repeatRequests]=await db.query('SELECT id FROM payment_refund_requests WHERE payment_id=? ORDER BY id',[repeat.paymentId]);
   const [[repeatCase]]=await db.query("SELECT subject_id FROM payment_reconciliation_cases WHERE payment_id=? AND case_type='REFUND_PROVIDER_RECOVERY_REQUIRED'",[repeat.paymentId]);
   assert.equal(repeatRequests.length,2);assert.equal(Number(repeatCase.subject_id),Number(repeatRequests[0].id));
   const [[repeatHistory]]=await db.query('SELECT JSON_LENGTH(evidence_history) entries,evidence FROM payment_reconciliation_cases WHERE payment_id=? AND case_type=?',[repeat.paymentId,'REFUND_PROVIDER_RECOVERY_REQUIRED']);assert.equal(Number(repeatHistory.entries),2);

   const stale=await paidMember('StaleRefund');
   const staleRef=`provider-refund-${key}`;gateway.refundReferences.add(staleRef);
   const [staleReq]=await db.query(`INSERT INTO payment_refund_requests(request_key,payment_id,amount,reason,status,requested_by,is_manual,provider_refund_reference,claim_owner,claimed_at,lease_expires_at,allocation_ids,created_at,updated_at) VALUES(?,?,?,?, 'PENDING_PROVIDER',?,0,?,?,NOW(),DATE_SUB(NOW(),INTERVAL 1 SECOND),?,NOW(),NOW())`,[`stale-${key}`,stale.paymentId,stale.amount,'stale refund',admin,staleRef,`old-${key}`,JSON.stringify([stale.allocationId])]);
   await db.query("UPDATE payment_cycle_allocations SET status='REFUNDING' WHERE id=?",[stale.allocationId]);
   const [r1,r2]=await Promise.all([worker(env,['sweep-refund',staleReq.insertId,staleRef,'0',`refund-a-${key}`]),worker(env,['sweep-refund',staleReq.insertId,staleRef,'0',`refund-b-${key}`])]);
   assert.equal(r1.ok,true);assert.equal(r2.ok,true);assert.equal(r1.result.refundsRecovered+r2.result.refundsRecovered,1);
   const [[staleRequest]]=await db.query('SELECT status FROM payment_refund_requests WHERE id=?',[staleReq.insertId]);assert.equal(staleRequest.status,'COMPLETED');
   const [[entitlement]]=await db.query('SELECT entitlement_status FROM membership_cycle_entitlements WHERE payment_allocation_id=?',[stale.allocationId]);assert.equal(entitlement.entitlement_status,'reversed');
   assert.equal(gateway.refundInitiations,0);

   const [claimAuditTypes]=await db.query('SELECT event_type,event_data FROM payment_audit_events WHERE event_type IN ("LEASE_CLAIMED","LEASE_RENEWED") AND JSON_EXTRACT(event_data,"$.requestId") IN (?,?)',[request.id,staleReq.insertId]);
   const auditRequestId=event=>Number((typeof event.event_data==='string'?JSON.parse(event.event_data):event.event_data).requestId);
   assert.ok(claimAuditTypes.some(x=>x.event_type==='LEASE_CLAIMED'&&auditRequestId(x)===Number(request.id)));assert.ok(claimAuditTypes.some(x=>x.event_type==='LEASE_RENEWED'&&auditRequestId(x)===Number(staleReq.insertId)));

   await assert.rejects(listReconciliationCases(memberId),/Unauthorized/);await assert.rejects(getReconciliationCase(memberId,refundCase.id),/Unauthorized/);
   await assert.rejects(listReconciliationCases(ordinaryAdmin),/Unauthorized/);await assert.rejects(claimReconciliationCase(ordinaryAdmin,refundCase.id,`ordinary-admin-${key}`),/Unauthorized/);await assert.rejects(escalateReconciliationCase(ordinaryAdmin,refundCase.id,'ordinary admin attempt',`ordinary-admin-${key}`),/Unauthorized/);await assert.rejects(resolveReconciliationCase({actorId:ordinaryAdmin,caseId:refundCase.id,workerId:`ordinary-admin-${key}`,action:'NO_ACTION_REQUIRED',reason:'ordinary admin attempt'}),/Unauthorized/);
   await db.query('CREATE TRIGGER phase1d_audit_fail BEFORE INSERT ON payment_audit_events FOR EACH ROW SIGNAL SQLSTATE "45000" SET MESSAGE_TEXT="forced audit failure"');
   try{
     await assert.rejects(claimReconciliationCase(admin,refundCase.id,`rollback-${key}`),/forced audit failure/);
     const [[rollbackCase]]=await db.query('SELECT status,assigned_to,claim_owner FROM payment_reconciliation_cases WHERE id=?',[refundCase.id]);
     assert.equal(rollbackCase.status,'OPEN');assert.equal(rollbackCase.assigned_to,null);assert.equal(rollbackCase.claim_owner,null);
   }finally{await db.query('DROP TRIGGER phase1d_audit_fail')}

   const claim=await claimReconciliationCase(admin,refundCase.id,`case-worker-${key}`);assert.equal(claim.status,'ASSIGNED');
   await assert.rejects(claimReconciliationCase(admin2,refundCase.id,'other-worker'),/cannot be claimed/);
   await assert.rejects(resolveReconciliationCase({actorId:admin2,caseId:refundCase.id,workerId:'other-worker',action:'NO_ACTION_REQUIRED',reason:'wrong owner'}),/not claimed/);
   await db.query("UPDATE payment_reconciliation_cases SET lease_expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE id=?",[refundCase.id]);
   await assert.rejects(resolveReconciliationCase({actorId:admin,caseId:refundCase.id,workerId:claim.workerId,action:'NO_ACTION_REQUIRED',reason:'expired'}),/not claimed/);
   await assert.rejects(escalateReconciliationCase(admin,refundCase.id,'expired',claim.workerId),/not claimed/);
   const [[beforeRenewal]]=await db.query('SELECT * FROM payment_reconciliation_cases WHERE id=?',[refundCase.id]);
   await db.query('CREATE TRIGGER phase1d_audit_fail BEFORE INSERT ON payment_audit_events FOR EACH ROW BEGIN IF NEW.event_type="LEASE_RENEWED" THEN SIGNAL SQLSTATE "45000" SET MESSAGE_TEXT="forced renewal audit failure"; END IF; END');
   try{
     await assert.rejects(claimReconciliationCase(admin2,refundCase.id,`failed-renewal-${key}`),/forced renewal audit failure/);
     const [[afterRenewal]]=await db.query('SELECT * FROM payment_reconciliation_cases WHERE id=?',[refundCase.id]);assert.deepEqual(afterRenewal,beforeRenewal);
     const [[partialAudit]]=await db.query('SELECT COUNT(*) c FROM payment_audit_events WHERE correlation_id=?',[`failed-renewal-${key}`]);assert.equal(Number(partialAudit.c),0);
   }finally{await db.query('DROP TRIGGER phase1d_audit_fail')}
   const reclaim=await claimReconciliationCase(admin2,refundCase.id,`case-worker-2-${key}`);assert.equal(reclaim.status,'ASSIGNED');
   const [[beforeEscalation]]=await db.query('SELECT * FROM payment_reconciliation_cases WHERE id=?',[refundCase.id]);
   await db.query('CREATE TRIGGER phase1d_audit_fail BEFORE INSERT ON payment_audit_events FOR EACH ROW SIGNAL SQLSTATE "45000" SET MESSAGE_TEXT="forced escalation audit failure"');
   try{
     await assert.rejects(escalateReconciliationCase(admin2,refundCase.id,'rollback escalation',reclaim.workerId),/forced escalation audit failure/);
     const [[afterEscalation]]=await db.query('SELECT * FROM payment_reconciliation_cases WHERE id=?',[refundCase.id]);assert.deepEqual(afterEscalation,beforeEscalation);
   }finally{await db.query('DROP TRIGGER phase1d_audit_fail')}
   await assert.rejects(resolveReconciliationCase({actorId:admin,caseId:refundCase.id,workerId:claim.workerId,action:'NO_ACTION_REQUIRED',reason:'stale owner'}),/not claimed/);
   await assert.rejects(escalateReconciliationCase(admin,refundCase.id,'stale owner',claim.workerId),/not claimed/);
   const escalation=await escalateReconciliationCase(admin2,refundCase.id,'Provider response required',reclaim.workerId);assert.equal(escalation.status,'ESCALATED');
   const [[released]]=await db.query('SELECT assigned_to,claim_owner,lease_expires_at,escalation_reason FROM payment_reconciliation_cases WHERE id=?',[refundCase.id]);
   assert.equal(released.assigned_to,null);assert.equal(released.claim_owner,null);assert.equal(released.lease_expires_at,null);assert.equal(released.escalation_reason,'Provider response required');
   await assert.rejects(resolveReconciliationCase({actorId:admin2,caseId:refundCase.id,workerId:reclaim.workerId,action:'NO_ACTION_REQUIRED',reason:'released'}),/not claimed/);
   const escalatedClaim=await claimReconciliationCase(admin,refundCase.id,`escalated-owner-${key}`);assert.equal(escalatedClaim.status,'ESCALATED');
   await assert.rejects(claimReconciliationCase(admin2,refundCase.id,'escalated-takeover'),/cannot be claimed/);
   await db.query("UPDATE payment_reconciliation_cases SET lease_expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE id=?",[refundCase.id]);
   const expiredEscalatedReclaim=await claimReconciliationCase(admin2,refundCase.id,`escalated-worker-2-${key}`);assert.equal(expiredEscalatedReclaim.status,'ESCALATED');
   const detail=await getReconciliationCase(admin2,refundCase.id);assert.ok(detail.case.payment_reference);assert.ok(detail.allocations.length);assert.ok(detail.auditEvents.length);
   const [[paymentBefore]]=await db.query('SELECT status FROM payment_transactions WHERE id=?',[detail.case.payment_id]);
   const resolution=await resolveReconciliationCase({actorId:admin2,caseId:refundCase.id,workerId:expiredEscalatedReclaim.workerId,action:'PROVIDER_CONTACT_REQUIRED',reason:'Provider lookup evidence required'});
   assert.equal(resolution.status,'RESOLVED');
   const [[paymentAfter]]=await db.query('SELECT status FROM payment_transactions WHERE id=?',[detail.case.payment_id]);assert.equal(paymentAfter.status,paymentBefore.status);
   const [[requestAfter]]=await db.query('SELECT status FROM payment_refund_requests WHERE id=?',[request.id]);assert.equal(requestAfter.status,'RECONCILIATION_REQUIRED');
   const [[workflowAudit]]=await db.query("SELECT COUNT(*) c FROM payment_audit_events WHERE payment_id=? AND event_type IN ('RECONCILIATION_ASSIGNED','RECONCILIATION_ESCALATED','RECONCILIATION_RESOLVED')",[detail.case.payment_id]);assert.ok(Number(workflowAudit.c)>=3);

   const deferred=await paidMember('DeferredRefund');const deferredRef=`deferred-refund-${key}`;gateway.refundReferences.add(deferredRef);
   const [deferredReq]=await db.query(`INSERT INTO payment_refund_requests(request_key,payment_id,amount,reason,status,requested_by,is_manual,provider_refund_reference,next_attempt_at,allocation_ids,created_at,updated_at) VALUES(?,?,?,?, 'PROVIDER_CONFIRMED',?,0,?,DATE_ADD(NOW(),INTERVAL 1 HOUR),?,NOW(),NOW())`,[`deferred-${key}`,deferred.paymentId,deferred.amount,'deferred refund',admin,deferredRef,JSON.stringify([deferred.allocationId])]);
   await db.query("UPDATE payment_cycle_allocations SET status='REFUNDING' WHERE id=?",[deferred.allocationId]);
   const early=await sweepPaymentLeases({...workerAuth,workerId:`early-${key}`,refundRequestId:deferredReq.insertId});assert.equal(early.initiationAttempts,0);assert.equal(early.refundAttempts,0);
   await db.query("UPDATE payment_refund_requests SET next_attempt_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE id=?",[deferredReq.insertId]);
   const due=await sweepPaymentLeases({...workerAuth,workerId:`due-${key}`,refundRequestId:deferredReq.insertId});assert.equal(due.refundAttempts,1);assert.equal(due.refundsRecovered,1);
   const [[deferredRetry]]=await db.query('SELECT retry_count FROM payment_refund_requests WHERE id=?',[deferredReq.insertId]);assert.equal(Number(deferredRetry.retry_count),1);
   const [[workerAudit]]=await db.query("SELECT actor_type,actor_id FROM payment_audit_events WHERE payment_id=? AND event_type='RECOVERY_ATTEMPTED' ORDER BY id DESC LIMIT 1",[deferred.paymentId]);const [[registeredWorker]]=await db.query('SELECT id FROM payment_recovery_workers WHERE worker_key=?',[WORKER_KEY]);assert.equal(workerAudit.actor_type,'recovery_worker');assert.equal(Number(workerAudit.actor_id),Number(registeredWorker.id));assert.notEqual(Number(workerAudit.actor_id),admin);
   const [[forgedAudit]]=await db.query('SELECT COUNT(*) c FROM payment_audit_events WHERE actor_type=? AND actor_id=?',['sweeper',admin]);assert.equal(Number(forgedAudit.c),0);

   const directBackoff=await paidMember('DirectBackoff');await db.query(`INSERT INTO payment_refund_requests(request_key,payment_id,amount,reason,status,requested_by,is_manual,provider_refund_reference,next_attempt_at,allocation_ids,created_at,updated_at) VALUES(?,?,?,?, 'PROVIDER_CONFIRMED',?,0,?,DATE_ADD(NOW(),INTERVAL 1 HOUR),?,NOW(),NOW())`,[`direct-backoff-${key}`,directBackoff.paymentId,directBackoff.amount,'direct backoff',admin,`direct-ref-${key}`,JSON.stringify([directBackoff.allocationId])]);
   await db.query('UPDATE payment_cycle_allocations SET status=? WHERE id=?',['REFUNDING',directBackoff.allocationId]);
   await assert.rejects(refundPaymentAllocations({paymentId:directBackoff.paymentId,allocationIds:[directBackoff.allocationId],amount:directBackoff.amount,reason:'direct backoff',actorId:admin,actorType:'admin',requestKey:`direct-backoff-${key}`,workerAuth}),/not due/i);
   await assert.rejects(reconcilePaymentInitiation(initPayment.id,{workerKey:'',workerSecret:''}),/Unauthorized recovery worker/);
   await assert.rejects(reconcilePaymentInitiation(initPayment.id,{workerKey:WORKER_KEY,workerSecret:`forged-${key}`}),/Unauthorized recovery worker/);
   await assert.rejects(refundPaymentAllocations({paymentId:directBackoff.paymentId,allocationIds:[directBackoff.allocationId],amount:directBackoff.amount,reason:'unauthenticated existing request',actorId:ordinaryAdmin,actorType:'admin',requestKey:`direct-backoff-${key}`}),/Unauthorized recovery worker/);

   const authority=await paidMember('StoredRefundAuthority');const authorityRef=`authority-refund-${key}`;gateway.refundReferences.add(authorityRef);
   const [authorityReq]=await db.query(`INSERT INTO payment_refund_requests(request_key,payment_id,amount,reason,status,requested_by,is_manual,provider_refund_reference,next_attempt_at,allocation_ids,created_at,updated_at) VALUES(?,?,?,?, 'PROVIDER_CONFIRMED',?,0,?,DATE_SUB(NOW(),INTERVAL 1 SECOND),?,NOW(),NOW())`,[`authority-${key}`,authority.paymentId,authority.amount,'stored reason',admin,authorityRef,JSON.stringify([authority.allocationId])]);
   await db.query('UPDATE payment_cycle_allocations SET status=? WHERE id=?',['REFUNDING',authority.allocationId]);
   await db.query('CREATE TRIGGER phase1f_refund_confirm_audit_fail BEFORE INSERT ON payment_audit_events FOR EACH ROW BEGIN IF NEW.event_type="REFUND_CONFIRMED" THEN SIGNAL SQLSTATE "45000" SET MESSAGE_TEXT="forced refund confirmation audit failure"; END IF; END');
   try{await assert.rejects(refundPaymentAllocations({paymentId:authority.paymentId,allocationIds:[999999],amount:1,reason:'forged reason',actorId:ordinaryAdmin,actorType:'admin',requestKey:`authority-${key}`,workerAuth}),/forced refund confirmation audit failure/)}finally{await db.query('DROP TRIGGER phase1f_refund_confirm_audit_fail')}
   const [[afterConfirmAuditFailure]]=await db.query('SELECT status,requested_by,amount,reason,allocation_ids FROM payment_refund_requests WHERE id=?',[authorityReq.insertId]);
   assert.equal(afterConfirmAuditFailure.status,'PROVIDER_CONFIRMED');assert.equal(Number(afterConfirmAuditFailure.requested_by),admin);assert.equal(Number(afterConfirmAuditFailure.amount),Number(authority.amount));assert.equal(afterConfirmAuditFailure.reason,'stored reason');assert.deepEqual(JSON.parse(afterConfirmAuditFailure.allocation_ids),[authority.allocationId]);
   const [[rolledBackRefund]]=await db.query('SELECT COUNT(*) c FROM payment_refunds WHERE payment_id=?',[authority.paymentId]);assert.equal(Number(rolledBackRefund.c),0);
   const [[activeEntitlement]]=await db.query('SELECT entitlement_status FROM membership_cycle_entitlements WHERE payment_allocation_id=?',[authority.allocationId]);assert.equal(activeEntitlement.entitlement_status,'active');
   const authorityResult=await refundPaymentAllocations({paymentId:authority.paymentId,allocationIds:[999999],amount:1,reason:'forged reason',actorId:ordinaryAdmin,actorType:'admin',requestKey:`authority-${key}`,workerAuth});
   const [[storedRefund]]=await db.query('SELECT amount,reason,requested_by,provider_refund_reference FROM payment_refunds WHERE id=?',[authorityResult.refundId]);
   assert.equal(Number(storedRefund.amount),Number(authority.amount));assert.equal(storedRefund.reason,'stored reason');assert.equal(Number(storedRefund.requested_by),admin);assert.equal(storedRefund.provider_refund_reference,authorityRef);
   const [[authorityAudit]]=await db.query("SELECT actor_type,actor_id,event_data FROM payment_audit_events WHERE payment_id=? AND event_type='REFUND_CONFIRMED' ORDER BY id DESC LIMIT 1",[authority.paymentId]);
   const [[registeredWorker2]]=await db.query('SELECT id FROM payment_recovery_workers WHERE worker_key=?',[WORKER_KEY]);
   assert.equal(authorityAudit.actor_type,'recovery_worker');assert.equal(Number(authorityAudit.actor_id),Number(registeredWorker2.id));assert.notEqual(Number(authorityAudit.actor_id),ordinaryAdmin);

   await assert.rejects(sweepPaymentLeases({workerKey:WORKER_KEY,workerSecret:`wrong-${key}`,workerId:`denied-${key}`}),/Unauthorized recovery worker/);
   await assert.rejects(sweepPaymentLeases({workerKey:`missing-${key}`,workerSecret:WORKER_SECRET,workerId:`denied-${key}`}),/Unauthorized recovery worker/);
   await assert.rejects(reconcilePaymentInitiation(initPayment.id,{workerKey:WORKER_KEY,workerSecret:`wrong-${key}`}),/Unauthorized recovery worker/);
   await assert.rejects(refundPaymentAllocations({paymentId:directBackoff.paymentId,allocationIds:[directBackoff.allocationId],amount:directBackoff.amount,reason:'forged worker recovery',actorId:admin,actorType:'admin',requestKey:`direct-backoff-${key}`,workerAuth:{workerKey:WORKER_KEY,workerSecret:`wrong-${key}`}}),/Unauthorized recovery worker/);

   const missingMember=await member('MissingMemberIdentity');gateway.initiationOutcome='accept';
   const missingIntent=await createPaymentIntent({actingUserId:missingMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`missing-member-${key}`});
   const [[missingAlloc]]=await db.query('SELECT amount FROM payment_cycle_allocations WHERE payment_id=?',[missingIntent.payment.id]);
   gateway.responses.set(missingIntent.payment.reference,{providerReference:missingIntent.payment.reference,providerTransactionId:`txn-missing-${key}`,state:'SUCCESS',amount:Number(missingAlloc.amount),currency:'TZS'});
   await assert.rejects(settlePayment(missingIntent.payment.id,'test'),/member identity/i);
   const [[missingState]]=await db.query("SELECT status FROM payment_transactions WHERE id=?",[missingIntent.payment.id]);assert.equal(missingState.status,'RECONCILIATION_REQUIRED');
   const [[missingEntitlement]]=await db.query('SELECT COUNT(*) c FROM membership_cycle_entitlements e JOIN payment_cycle_allocations a ON a.id=e.payment_allocation_id WHERE a.payment_id=?',[missingIntent.payment.id]);assert.equal(Number(missingEntitlement.c),0);
   const mismatchMember=await member('MismatchMemberIdentity');const mismatchIntent=await createPaymentIntent({actingUserId:mismatchMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`mismatch-member-${key}`});const [[mismatchAlloc]]=await db.query('SELECT amount FROM payment_cycle_allocations WHERE payment_id=?',[mismatchIntent.payment.id]);
   gateway.responses.set(mismatchIntent.payment.reference,{providerReference:mismatchIntent.payment.reference,providerTransactionId:`txn-mismatch-${key}`,state:'SUCCESS',amount:Number(mismatchAlloc.amount),currency:'TZS',memberReference:`different-${mismatchIntent.payment.reference}`});
   await assert.rejects(settlePayment(mismatchIntent.payment.id,'test'),/member reference mismatch/i);const [[mismatchState]]=await db.query('SELECT status FROM payment_transactions WHERE id=?',[mismatchIntent.payment.id]);assert.equal(mismatchState.status,'RECONCILIATION_REQUIRED');
   const malformedMember=await member('MalformedMemberIdentity');const malformedIntent=await createPaymentIntent({actingUserId:malformedMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`malformed-member-${key}`});const [[malformedAlloc]]=await db.query('SELECT amount FROM payment_cycle_allocations WHERE payment_id=?',[malformedIntent.payment.id]);
   gateway.responses.set(malformedIntent.payment.reference,{providerReference:malformedIntent.payment.reference,providerTransactionId:`txn-malformed-${key}`,state:'SUCCESS',amount:Number(malformedAlloc.amount),currency:'TZS',memberReference:'***'});
   await assert.rejects(settlePayment(malformedIntent.payment.id,'test'),/missing or malformed/i);const [[malformedState]]=await db.query('SELECT status FROM payment_transactions WHERE id=?',[malformedIntent.payment.id]);assert.equal(malformedState.status,'RECONCILIATION_REQUIRED');

   const recurrence=await paidMember('CaseRecurrence',[2026,2027]);gateway.initiateRefund=async()=>{throw new Error('Synthetic first refund uncertainty')};
   const [recReq1]=await db.query(`INSERT INTO payment_refund_requests(request_key,payment_id,amount,reason,status,requested_by,is_manual,allocation_ids,created_at,updated_at) VALUES(?,?,?,?, 'REQUESTED',?,0,?,NOW(),NOW())`,[`rec-1-${key}`,recurrence.paymentId,Number(recurrence.allocations[0].amount),'first recurrence',admin,JSON.stringify([recurrence.allocations[0].id])]);
   await db.query('UPDATE payment_cycle_allocations SET status=? WHERE id=?',['REFUNDING',recurrence.allocations[0].id]);
   await assert.rejects(refundPaymentAllocations({paymentId:recurrence.paymentId,allocationIds:[recurrence.allocations[0].id],amount:Number(recurrence.allocations[0].amount),reason:'first recurrence',actorId:admin,actorType:'admin',requestKey:`rec-1-${key}`,workerAuth}),/uncertainty/);
   const [[recCase1]]=await db.query("SELECT id,subject_id FROM payment_reconciliation_cases WHERE payment_id=? AND case_type='REFUND_PROVIDER_RECOVERY_REQUIRED' AND status='OPEN'",[recurrence.paymentId]);assert.equal(Number(recCase1.subject_id),Number(recReq1.insertId));
   const recClaim=await claimReconciliationCase(admin,recCase1.id,`rec-claim-${key}`);
   await resolveReconciliationCase({actorId:admin,caseId:recCase1.id,workerId:recClaim.workerId,action:'NO_ACTION_REQUIRED',reason:'first case resolved'});
   const [recReq2]=await db.query(`INSERT INTO payment_refund_requests(request_key,payment_id,amount,reason,status,requested_by,is_manual,allocation_ids,created_at,updated_at) VALUES(?,?,?,?, 'REQUESTED',?,0,?,NOW(),NOW())`,[`rec-2-${key}`,recurrence.paymentId,Number(recurrence.allocations[1].amount),'second recurrence',admin,JSON.stringify([recurrence.allocations[1].id])]);
   await db.query('UPDATE payment_cycle_allocations SET status=? WHERE id=?',['REFUNDING',recurrence.allocations[1].id]);
   await assert.rejects(refundPaymentAllocations({paymentId:recurrence.paymentId,allocationIds:[recurrence.allocations[1].id],amount:Number(recurrence.allocations[1].amount),reason:'second recurrence',actorId:admin,actorType:'admin',requestKey:`rec-2-${key}`,workerAuth}),/uncertainty/);
   const [activeCases]=await db.query("SELECT id,subject_id,recurrence_index,parent_case_id FROM payment_reconciliation_cases WHERE payment_id=? AND case_type='REFUND_PROVIDER_RECOVERY_REQUIRED' AND status IN ('OPEN','ASSIGNED','ESCALATED')",[recurrence.paymentId]);
   assert.equal(activeCases.length,1);assert.equal(Number(activeCases[0].subject_id),Number(recReq2.insertId));assert.equal(Number(activeCases[0].recurrence_index),1);assert.equal(Number(activeCases[0].parent_case_id),Number(recCase1.id));
   assert.ok((await listReconciliationCases(admin)).some(c=>Number(c.id)===Number(activeCases[0].id)));

   const raceMember=await member('StaleRace');gateway.initiationOutcome='timeout-after-accept';await assert.rejects(createPaymentIntent({actingUserId:raceMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`race-${key}`}),/timeout/);
   const [[racePayment]]=await db.query('SELECT id,reference FROM payment_transactions WHERE user_id=?',[raceMember]);
   await db.query("UPDATE payment_initiation_attempts SET status='PENDING_PROVIDER',lease_expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND),next_attempt_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE payment_id=?",[racePayment.id]);
   const originalCheck=gateway.checkInitiation.bind(gateway);let releaseOutcome;gateway.checkInitiation=async()=>new Promise(resolve=>{releaseOutcome=()=>resolve({outcome:'OUTCOME_UNKNOWN',reason:'late unknown'})});
   const staleRecovery=reconcilePaymentInitiation(racePayment.id,workerAuth);
   await new Promise(r=>setTimeout(r,50));
   const [[raceAlloc]]=await db.query('SELECT amount FROM payment_cycle_allocations WHERE payment_id=?',[racePayment.id]);
   gateway.responses.set(racePayment.reference,{providerReference:racePayment.reference,providerTransactionId:`txn-race-${key}`,state:'SUCCESS',amount:Number(raceAlloc.amount),currency:'TZS',memberReference:racePayment.reference});
   assert.equal((await settlePayment(racePayment.id,'test')).status,'SUCCESS');releaseOutcome();assert.equal((await staleRecovery).status,'STALE_PAYMENT_STATE');
   const [[raceFinal]]=await db.query('SELECT p.status payment_status,a.status attempt_status,e.entitlement_status FROM payment_transactions p JOIN payment_initiation_attempts a ON a.payment_id=p.id JOIN payment_cycle_allocations al ON al.payment_id=p.id JOIN membership_cycle_entitlements e ON e.payment_allocation_id=al.id WHERE p.id=?',[racePayment.id]);
   assert.equal(raceFinal.payment_status,'SUCCESS');assert.equal(raceFinal.attempt_status,'COMPLETED');assert.equal(raceFinal.entitlement_status,'active');
   gateway.checkInitiation=originalCheck;

   const originalRaceMember=await member('OriginalStaleRace');let releaseInitial;
   const originalInitiate=gateway.initiatePayment.bind(gateway);
   gateway.initiatePayment=async input=>{gateway.initiatedSessions.add(input.paymentReference);await new Promise(resolve=>{releaseInitial=()=>resolve()});throw Object.assign(new Error('late definite rejection'),{definiteRejection:true})};
   const originalInitial=createPaymentIntent({actingUserId:originalRaceMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`original-stale-${key}`});
   await new Promise(r=>setTimeout(r,50));
   const [[originalPayment]]=await db.query('SELECT id,reference FROM payment_transactions WHERE user_id=?',[originalRaceMember]);
   await db.query("UPDATE payment_initiation_attempts SET lease_expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE payment_id=?",[originalPayment.id]);
   const originalRecovery=await reconcilePaymentInitiation(originalPayment.id,workerAuth);assert.equal(originalRecovery.status,'PROVIDER_ACCEPTED');
   const [[originalAlloc]]=await db.query('SELECT amount FROM payment_cycle_allocations WHERE payment_id=?',[originalPayment.id]);
   gateway.responses.set(originalPayment.reference,{providerReference:originalPayment.reference,providerTransactionId:`txn-original-${key}`,state:'SUCCESS',amount:Number(originalAlloc.amount),currency:'TZS',memberReference:originalPayment.reference});
   assert.equal((await settlePayment(originalPayment.id,'test')).status,'SUCCESS');
   releaseInitial();const originalResult=await originalInitial;assert.equal(originalResult.initiation.status,'STALE_CLAIM');
   const [[originalFinal]]=await db.query('SELECT p.status payment_status,a.status attempt_status,e.entitlement_status FROM payment_transactions p JOIN payment_initiation_attempts a ON a.payment_id=p.id JOIN payment_cycle_allocations al ON al.payment_id=p.id JOIN membership_cycle_entitlements e ON e.payment_allocation_id=al.id WHERE p.id=?',[originalPayment.id]);
   assert.equal(originalFinal.payment_status,'SUCCESS');assert.equal(originalFinal.attempt_status,'PROVIDER_ACCEPTED');assert.equal(originalFinal.entitlement_status,'active');
   const [[originalAudit]]=await db.query("SELECT SUM(event_type='PAYMENT_FAILED') failed,SUM(event_type='RECOVERY_STALE_CLAIM') stale,SUM(event_type='PAYMENT_SUCCESS') success FROM payment_audit_events WHERE payment_id=?",[originalPayment.id]);
   assert.equal(Number(originalAudit.failed),0);assert.ok(Number(originalAudit.stale)>=1);assert.equal(Number(originalAudit.success),1);
   gateway.initiatePayment=originalInitiate;

   const acceptedMember=await member('OriginalStaleAccept');let releaseAccepted;
   gateway.initiatePayment=async input=>{gateway.initiatedSessions.add(input.paymentReference);return new Promise(resolve=>{releaseAccepted=()=>resolve({providerReference:input.paymentReference,checkoutUrl:`test://checkout/${input.paymentReference}`})})};
   const acceptedInitial=createPaymentIntent({actingUserId:acceptedMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`original-accept-${key}`});
   await new Promise(r=>setTimeout(r,50));
   const [[acceptedPayment]]=await db.query('SELECT id,reference FROM payment_transactions WHERE user_id=?',[acceptedMember]);
   await db.query("UPDATE payment_initiation_attempts SET lease_expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE payment_id=?",[acceptedPayment.id]);
   assert.equal((await reconcilePaymentInitiation(acceptedPayment.id,workerAuth)).status,'PROVIDER_ACCEPTED');
   const [[acceptedAlloc]]=await db.query('SELECT amount FROM payment_cycle_allocations WHERE payment_id=?',[acceptedPayment.id]);
   gateway.responses.set(acceptedPayment.reference,{providerReference:acceptedPayment.reference,providerTransactionId:`txn-accepted-${key}`,state:'SUCCESS',amount:Number(acceptedAlloc.amount),currency:'TZS',memberReference:acceptedPayment.reference});
   assert.equal((await settlePayment(acceptedPayment.id,'test')).status,'SUCCESS');
   releaseAccepted();assert.equal((await acceptedInitial).initiation.status,'STALE_CLAIM');
   const [[acceptedFinal]]=await db.query('SELECT p.status payment_status,a.status attempt_status,e.entitlement_status FROM payment_transactions p JOIN payment_initiation_attempts a ON a.payment_id=p.id JOIN payment_cycle_allocations al ON al.payment_id=p.id JOIN membership_cycle_entitlements e ON e.payment_allocation_id=al.id WHERE p.id=?',[acceptedPayment.id]);
   assert.equal(acceptedFinal.payment_status,'SUCCESS');assert.equal(acceptedFinal.attempt_status,'PROVIDER_ACCEPTED');assert.equal(acceptedFinal.entitlement_status,'active');
   gateway.initiatePayment=originalInitiate;

   const unknownMember2=await member('OriginalStaleUnknown');let releaseUnknown;
   gateway.initiatePayment=async input=>{gateway.initiatedSessions.add(input.paymentReference);await new Promise(resolve=>{releaseUnknown=resolve});throw new Error('late uncertain original outcome')};
   const unknownInitial=createPaymentIntent({actingUserId:unknownMember2,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`original-unknown-${key}`});
   await new Promise(r=>setTimeout(r,50));
   const [[unknownPayment2]]=await db.query('SELECT id,reference FROM payment_transactions WHERE user_id=?',[unknownMember2]);
   await db.query("UPDATE payment_initiation_attempts SET lease_expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE payment_id=?",[unknownPayment2.id]);
   assert.equal((await reconcilePaymentInitiation(unknownPayment2.id,workerAuth)).status,'PROVIDER_ACCEPTED');
   const [[unknownAlloc]]=await db.query('SELECT amount FROM payment_cycle_allocations WHERE payment_id=?',[unknownPayment2.id]);
   gateway.responses.set(unknownPayment2.reference,{providerReference:unknownPayment2.reference,providerTransactionId:`txn-unknown-${key}`,state:'SUCCESS',amount:Number(unknownAlloc.amount),currency:'TZS',memberReference:unknownPayment2.reference});
   assert.equal((await settlePayment(unknownPayment2.id,'test')).status,'SUCCESS');
   releaseUnknown();assert.equal((await unknownInitial).initiation.status,'STALE_CLAIM');
   const [[unknownFinal]]=await db.query('SELECT p.status payment_status,a.status attempt_status,e.entitlement_status FROM payment_transactions p JOIN payment_initiation_attempts a ON a.payment_id=p.id JOIN payment_cycle_allocations al ON al.payment_id=p.id JOIN membership_cycle_entitlements e ON e.payment_allocation_id=al.id WHERE p.id=?',[unknownPayment2.id]);
   assert.equal(unknownFinal.payment_status,'SUCCESS');assert.equal(unknownFinal.attempt_status,'PROVIDER_ACCEPTED');assert.equal(unknownFinal.entitlement_status,'active');
   const [[unknownAudit]]=await db.query("SELECT COUNT(*) c FROM payment_audit_events WHERE payment_id=? AND event_type IN ('PAYMENT_FAILED','PAYMENT_VERIFICATION_REQUIRED')",[unknownPayment2.id]);assert.equal(Number(unknownAudit.c),0);
   gateway.initiatePayment=originalInitiate;

   const reclaimMember=await member('ReclaimedClaim');gateway.initiationOutcome='timeout-after-accept';await assert.rejects(createPaymentIntent({actingUserId:reclaimMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`reclaim-${key}`}),/timeout/);
   const [[reclaimPayment]]=await db.query('SELECT id,reference FROM payment_transactions WHERE user_id=?',[reclaimMember]);
   await db.query("UPDATE payment_initiation_attempts SET status='PENDING_PROVIDER',lease_expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE payment_id=?",[reclaimPayment.id]);
   let releaseFirst;gateway.checkInitiation=async()=>new Promise(resolve=>{releaseFirst=()=>resolve({outcome:'OUTCOME_UNKNOWN',reason:'reclaimed late outcome'})});
   const firstWorker=reconcilePaymentInitiation(reclaimPayment.id,workerAuth);await new Promise(r=>setTimeout(r,50));
   await db.query('UPDATE payment_initiation_attempts SET lease_expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE payment_id=?',[reclaimPayment.id]);
   gateway.checkInitiation=originalCheck;const secondWorker=await reconcilePaymentInitiation(reclaimPayment.id,workerAuth);
   assert.equal(secondWorker.status,'PROVIDER_ACCEPTED');releaseFirst();assert.equal((await firstWorker).status,'STALE_CLAIM');
   const [[reclaimAttempt]]=await db.query('SELECT status,claim_owner FROM payment_initiation_attempts WHERE payment_id=?',[reclaimPayment.id]);assert.equal(reclaimAttempt.status,'PROVIDER_ACCEPTED');

   const auditFailMember=await member('AuditFailureRecovery');gateway.initiationOutcome='timeout-before-accept';await assert.rejects(createPaymentIntent({actingUserId:auditFailMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`audit-fail-${key}`}),/timeout/);
   const [[auditFailPayment]]=await db.query('SELECT id FROM payment_transactions WHERE user_id=?',[auditFailMember]);
   await db.query("UPDATE payment_initiation_attempts SET status='OUTCOME_UNKNOWN',lease_expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND),next_attempt_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE payment_id=?",[auditFailPayment.id]);
   const previousCheck=gateway.checkInitiation.bind(gateway);gateway.checkInitiation=async()=>{throw new Error('provider lookup unavailable')};
   await db.query('CREATE TRIGGER phase1e_audit_fail BEFORE INSERT ON payment_audit_events FOR EACH ROW BEGIN IF NEW.event_type="INITIATION_RECOVERY_FAILED" THEN SIGNAL SQLSTATE "45000" SET MESSAGE_TEXT="forced recovery audit failure"; END IF; END');
   try{await assert.rejects(reconcilePaymentInitiation(auditFailPayment.id,workerAuth),/forced recovery audit failure/)}finally{await db.query('DROP TRIGGER phase1e_audit_fail')}
   const [[afterAuditFailure]]=await db.query('SELECT status,next_attempt_at,last_error FROM payment_initiation_attempts WHERE payment_id=?',[auditFailPayment.id]);assert.equal(afterAuditFailure.status,'RECONCILING');assert.equal(afterAuditFailure.next_attempt_at,null);assert.equal(afterAuditFailure.last_error,'Synthetic gateway initiation timeout');
   gateway.checkInitiation=previousCheck;

   await db.query('UPDATE payment_initiation_attempts SET retry_count=999 WHERE retry_count<999');
   await db.query('UPDATE payment_refund_requests SET retry_count=999 WHERE retry_count<999');
   const mixedSuccess=await paidMember('MixedSuccess');const mixedRef=`mixed-refund-${key}`;
   const [mixedReq]=await db.query(`INSERT INTO payment_refund_requests(request_key,payment_id,amount,reason,status,requested_by,is_manual,provider_refund_reference,claim_owner,claimed_at,lease_expires_at,allocation_ids,created_at,updated_at) VALUES(?,?,?,?, 'PENDING_PROVIDER',?,0,?,?,NOW(),DATE_SUB(NOW(),INTERVAL 1 SECOND),?,DATE_SUB(NOW(),INTERVAL 1 MINUTE),DATE_SUB(NOW(),INTERVAL 1 MINUTE))`,[`mixed-${key}`,mixedSuccess.paymentId,mixedSuccess.amount,'mixed success',admin,mixedRef,`old-mixed-${key}`,JSON.stringify([mixedSuccess.allocationId])]);
   await db.query("UPDATE payment_cycle_allocations SET status='REFUNDING' WHERE id=?",[mixedSuccess.allocationId]);
   const mixedFailure=await paidMember('MixedFailure');
   const [badReq]=await db.query(`INSERT INTO payment_refund_requests(request_key,payment_id,amount,reason,status,requested_by,is_manual,allocation_ids,created_at,updated_at) VALUES(?,?,?,?, 'REQUESTED',?,0,'[]',DATE_SUB(NOW(),INTERVAL 2 MINUTE),DATE_SUB(NOW(),INTERVAL 2 MINUTE))`,[`bad-${key}`,mixedFailure.paymentId,mixedFailure.amount,'invalid allocation payload',admin]);
   const [u1,u2]=await Promise.all([worker(env,['sweep-all','0',mixedRef,'2',`unscoped-a-${key}`]),worker(env,['sweep-all','0',mixedRef,'2',`unscoped-b-${key}`])]);
   assert.equal(u1.ok,true);assert.equal(u2.ok,true);assert.ok(u1.result.refundAttempts<=2&&u2.result.refundAttempts<=2);
   assert.equal(u1.result.refundsRecovered+u2.result.refundsRecovered,1);assert.ok(u1.result.failed+u2.result.failed>=1);assert.ok(u1.result.refundAttempts+u2.result.refundAttempts>=2);
   const [[mixedState]]=await db.query('SELECT status FROM payment_refund_requests WHERE id=?',[mixedReq.insertId]);assert.equal(mixedState.status,'COMPLETED');
   const [[badState]]=await db.query('SELECT status,retry_count,next_attempt_at,last_error FROM payment_refund_requests WHERE id=?',[badReq.insertId]);
   const [[badFailureAudit]]=await db.query("SELECT COUNT(*) c FROM payment_audit_events WHERE payment_id=? AND event_type='RECOVERY_FAILED' AND JSON_EXTRACT(event_data,'$.requestId')=?",[mixedFailure.paymentId,badReq.insertId]);
   assert.equal(badState.status,'REQUESTED');assert.equal(Number(badState.retry_count),Number(badFailureAudit.c));assert.ok(new Date(badState.next_attempt_at)>new Date());assert.ok(badState.last_error);assert.ok(Number(badFailureAudit.c)>=1);
   const scopedBackoff=await sweepPaymentLeases({...workerAuth,workerId:`backoff-${key}`,refundRequestId:badReq.insertId});assert.equal(scopedBackoff.refundAttempts,0);
   assert.equal(gateway.refundInitiations,0);

   const second=await sweepPaymentLeases({...workerAuth,workerId:`repeat-${key}`,paymentId:initPayment.id,refundRequestId:staleReq.insertId});assert.equal(second.initiationAttempts,0);assert.equal(second.refundAttempts,0);
 }finally{await db.end();await pool.end()}
});

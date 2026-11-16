import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

function worker(env,args){
  return new Promise(resolve=>{const child=spawn(process.execPath,['tests/phase1a-worker.mjs',...args],{env,cwd:process.cwd()});let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);child.on('close',()=>resolve(JSON.parse(output.trim().split('\n').pop())))});
}

test('phase1c payment lifecycle recovery and reconciliation',{skip:process.env.PHASE1A_TEST_DB!=='1'},async()=>{
 const mysql=(await import('mysql2/promise')).default;
 const {TestPaymentGateway,registerGateway}=await import('../lib/payments/gateways.ts');
 const {createPaymentIntent,reconcilePaymentInitiation,settlePayment,transitionPayment,refundPaymentAllocations}=await import('../lib/payments/service.ts');
 const {pool}=await import('../lib/db.ts');
 const db=mysql.createPool({host:'localhost',port:3306,user:'root',password:'',database:'phase1a_test',ssl:false});
 const key=Date.now();
 const WORKER_KEY=`phase1f-worker-${key}`;const WORKER_SECRET=`phase1f-secret-${key}`;const workerAuth={workerKey:WORKER_KEY,workerSecret:WORKER_SECRET};
 async function member(name){const [r]=await db.query("INSERT INTO users(name,email,password,user_category,role,is_approved,created_at,updated_at) VALUES(?,?,'hash','regular','member',1,NOW(),NOW())",[name,`phase1c.${name.toLowerCase()}.${key}.${Math.random()}@example.invalid`]);return r.insertId}
 async function state(paymentId){const [p]=await db.query('SELECT id,user_id,status,provider_reference,provider_transaction_id FROM payment_transactions WHERE id=?',[paymentId]);const [r]=await db.query('SELECT status,payment_id FROM payment_cycle_reservations WHERE user_id=? ORDER BY id DESC LIMIT 1',[p[0].user_id]);const [a]=await db.query('SELECT status,provider_reference,retry_count,claim_owner,lease_expires_at FROM payment_initiation_attempts WHERE payment_id=?',[paymentId]);return{payment:p[0],reservation:r[0],attempt:a[0]}}
 try{
   const [[dn]]=await db.query('SELECT DATABASE() db');assert.equal(dn.db,'phase1a_test');
   const [admin]=await db.query('SELECT id FROM users WHERE is_admin=1 ORDER BY id LIMIT 1');
   const gateway=new TestPaymentGateway();registerGateway(gateway);
   await db.query('INSERT INTO payment_recovery_workers(worker_key,secret_hash,is_active) VALUES(?,?,1)',[WORKER_KEY,createHash('sha256').update(WORKER_SECRET).digest('hex')]);

   const rejectedMember=await member('Rejected');
   gateway.initiationOutcome='definite-reject';
   await assert.rejects(createPaymentIntent({actingUserId:rejectedMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`reject-${key}`}),/initiation failure/);
   const [rejectedPayment]=await db.query('SELECT id FROM payment_transactions WHERE user_id=?',[rejectedMember]);
   let s=await state(rejectedPayment[0].id);
   assert.equal(s.payment.status,'FAILED');assert.equal(s.reservation.status,'RELEASED');assert.equal(s.attempt.status,'DEFINITE_REJECTION');

   const unknownMember=await member('Unknown');
   gateway.initiationOutcome='timeout-before-accept';
   await assert.rejects(createPaymentIntent({actingUserId:unknownMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`unknown-${key}`}),/timeout/);
   const [unknownPayment]=await db.query('SELECT id,reference FROM payment_transactions WHERE user_id=?',[unknownMember]);
   s=await state(unknownPayment[0].id);
   assert.equal(s.payment.status,'VERIFICATION_REQUIRED');assert.equal(s.reservation.status,'ACTIVE');assert.equal(s.attempt.status,'OUTCOME_UNKNOWN');assert.equal(gateway.initiationCalls,2);
   await assert.rejects(createPaymentIntent({actingUserId:unknownMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`unknown-retry-${key}`}),/active payment reservation/);
   const unknownResult=await reconcilePaymentInitiation(unknownPayment[0].id,workerAuth);
   assert.equal(unknownResult.status,'OUTCOME_UNKNOWN');
   s=await state(unknownPayment[0].id);assert.equal(s.reservation.status,'ACTIVE');assert.equal(gateway.initiationCalls,2);
   gateway.initiatedSessions.add(unknownPayment[0].reference);
   await db.query("UPDATE payment_initiation_attempts SET next_attempt_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE payment_id=?",[unknownPayment[0].id]);
   const recovered=await reconcilePaymentInitiation(unknownPayment[0].id,workerAuth);
   assert.equal(recovered.status,'PROVIDER_ACCEPTED');
   s=await state(unknownPayment[0].id);assert.equal(s.payment.status,'PROCESSING');assert.equal(s.payment.provider_reference,unknownPayment[0].reference);assert.equal(gateway.initiationCalls,2);

   const crashMember=await member('Crash');
   gateway.initiationOutcome='timeout-after-accept';
   await assert.rejects(createPaymentIntent({actingUserId:crashMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`crash-${key}`}),/timeout/);
   const [crashPayment]=await db.query('SELECT id FROM payment_transactions WHERE user_id=?',[crashMember]);
   await db.query("UPDATE payment_initiation_attempts SET status='PENDING_PROVIDER',lease_expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND),provider_reference=NULL WHERE payment_id=?",[crashPayment[0].id]);
   const crashRecovery=await reconcilePaymentInitiation(crashPayment[0].id,workerAuth);
   assert.equal(crashRecovery.status,'PROVIDER_ACCEPTED');
   s=await state(crashPayment[0].id);assert.equal(s.payment.status,'PROCESSING');assert.equal(s.reservation.status,'ACTIVE');

   const noLookupMember=await member('NoLookup');
   gateway.initiationOutcome='timeout-before-accept';
   await assert.rejects(createPaymentIntent({actingUserId:noLookupMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`no-lookup-${key}`}),/timeout/);
   const [noLookupPayment]=await db.query('SELECT id FROM payment_transactions WHERE user_id=?',[noLookupMember]);
   gateway.checkInitiation=undefined;
   const noLookup=await reconcilePaymentInitiation(noLookupPayment[0].id,workerAuth);
   delete gateway.checkInitiation;
   assert.equal(noLookup.status,'RECONCILIATION_REQUIRED');
   s=await state(noLookupPayment[0].id);assert.equal(s.payment.status,'RECONCILIATION_REQUIRED');assert.equal(s.reservation.status,'ACTIVE');
   const [noLookupCase]=await db.query('SELECT status FROM payment_reconciliation_cases WHERE payment_id=? AND case_type=?',[noLookupPayment[0].id,'INITIATION_LOOKUP_UNAVAILABLE']);
   assert.equal(noLookupCase[0].status,'OPEN');

   const lateMember=await member('Late');
   gateway.initiationOutcome='accept';
   const lateIntent=await createPaymentIntent({actingUserId:lateMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`late-${key}`});
   gateway.responses.set(lateIntent.payment.reference,{providerReference:lateIntent.payment.reference,providerTransactionId:`txn-late-valid-${key}`,state:'SUCCESS',amount:40000,currency:'TZS',memberReference:lateIntent.payment.reference});
   await db.query('UPDATE payment_transactions SET expires_at=DATE_SUB(NOW(),INTERVAL 1 MINUTE) WHERE id=?',[lateIntent.payment.id]);
   assert.equal((await settlePayment(lateIntent.payment.id,'test')).status,'SUCCESS');

   const expiredReservationMember=await member('ExpiredReservation');
   const expiredIntent=await createPaymentIntent({actingUserId:expiredReservationMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`late-exp-${key}`});
   gateway.responses.set(expiredIntent.payment.reference,{providerReference:expiredIntent.payment.reference,providerTransactionId:`txn-late-exp-${key}`,state:'SUCCESS',amount:40000,currency:'TZS',memberReference:expiredIntent.payment.reference});
   await db.query('UPDATE payment_cycle_reservations SET expires_at=DATE_SUB(NOW(),INTERVAL 1 MINUTE) WHERE payment_id=?',[expiredIntent.payment.id]);
   const lateExpired=await settlePayment(expiredIntent.payment.id,'test');
   assert.equal(lateExpired.status,'RECONCILIATION_REQUIRED');
   s=await state(expiredIntent.payment.id);assert.equal(s.payment.status,'RECONCILIATION_REQUIRED');assert.equal(s.payment.provider_transaction_id,`txn-late-exp-${key}`);assert.equal(s.reservation.status,'EXPIRED');
   const [reconCase]=await db.query('SELECT status,provider_transaction_id FROM payment_reconciliation_cases WHERE payment_id=? AND case_type=?',[expiredIntent.payment.id,'LATE_PROVIDER_SUCCESS']);
   assert.equal(reconCase[0].status,'OPEN');assert.equal(reconCase[0].provider_transaction_id,`txn-late-exp-${key}`);

   const replacedMember=await member('Replaced');
   const oldIntent=await createPaymentIntent({actingUserId:replacedMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`old-${key}`});
   gateway.responses.set(oldIntent.payment.reference,{providerReference:oldIntent.payment.reference,state:'EXPIRED',amount:40000,currency:'TZS',memberReference:oldIntent.payment.reference});
   assert.equal((await settlePayment(oldIntent.payment.id,'test')).status,'EXPIRED');
   const newIntent=await createPaymentIntent({actingUserId:replacedMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`new-${key}`});
   gateway.responses.set(newIntent.payment.reference,{providerReference:newIntent.payment.reference,providerTransactionId:`txn-new-${key}`,state:'SUCCESS',amount:40000,currency:'TZS',memberReference:newIntent.payment.reference});
   assert.equal((await settlePayment(newIntent.payment.id,'test')).status,'SUCCESS');
   gateway.responses.set(oldIntent.payment.reference,{providerReference:oldIntent.payment.reference,providerTransactionId:`txn-old-late-${key}`,state:'SUCCESS',amount:40000,currency:'TZS',memberReference:oldIntent.payment.reference});
   const oldLate=await settlePayment(oldIntent.payment.id,'test');
   assert.equal(oldLate.status,'RECONCILIATION_REQUIRED');
   const [newEntitlement]=await db.query('SELECT e.entitlement_status FROM membership_cycle_entitlements e JOIN payment_cycle_allocations a ON a.id=e.payment_allocation_id WHERE a.payment_id=?',[newIntent.payment.id]);
   assert.equal(newEntitlement[0].entitlement_status,'active');

   const staleMember=await member('Stale');
   const staleIntent=await createPaymentIntent({actingUserId:staleMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`stale-${key}`});
   gateway.responses.set(staleIntent.payment.reference,{providerReference:staleIntent.payment.reference,providerTransactionId:`txn-stale-${key}`,state:'SUCCESS',amount:40000,currency:'TZS',memberReference:staleIntent.payment.reference});
   gateway.verificationDelayMs=100;
   const staleDb=mysql.createPool({host:'localhost',port:3306,user:'root',password:'',database:'phase1a_test',ssl:false});
   try{
     const staleSettle=settlePayment(staleIntent.payment.id,'stale-test');
     await staleDb.query("UPDATE payment_cycle_reservations SET status='RELEASED',payment_id=NULL WHERE payment_id=?",[staleIntent.payment.id]);
     const staleResult=await staleSettle;
     assert.equal(staleResult.status,'RECONCILIATION_REQUIRED');
   }finally{await staleDb.end();gateway.verificationDelayMs=0}
   const [stalePayment]=await db.query('SELECT status,provider_transaction_id FROM payment_transactions WHERE id=?',[staleIntent.payment.id]);
   assert.equal(stalePayment[0].status,'RECONCILIATION_REQUIRED');assert.equal(stalePayment[0].provider_transaction_id,`txn-stale-${key}`);
   const [staleCase]=await db.query('SELECT status FROM payment_reconciliation_cases WHERE payment_id=?',[staleIntent.payment.id]);
   assert.equal(staleCase[0].status,'OPEN');

   const transitionMember=await member('Transitions');
   gateway.initiationOutcome='timeout-before-accept';
   await assert.rejects(createPaymentIntent({actingUserId:transitionMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`transition-${key}`}),/timeout/);
   const [transitionPaymentRow]=await db.query('SELECT id FROM payment_transactions WHERE user_id=?',[transitionMember]);
   const transitionId=transitionPaymentRow[0].id;
   for(const stateName of ['FAILED','CANCELLED','EXPIRED','REFUNDED'])await assert.rejects(transitionPayment(transitionId,stateName,'admin'),/Invalid payment transition/);
   s=await state(transitionId);assert.equal(s.payment.status,'VERIFICATION_REQUIRED');assert.equal(s.reservation.status,'ACTIVE');
   await db.query("UPDATE payment_transactions SET status='PENDING' WHERE id=?",[transitionId]);
   for(const stateName of ['FAILED','CANCELLED','EXPIRED','REFUNDED'])await assert.rejects(transitionPayment(transitionId,stateName,'admin'),/Invalid payment transition/);
   s=await state(transitionId);assert.equal(s.payment.status,'PENDING');assert.equal(s.reservation.status,'ACTIVE');
   await db.query("UPDATE payment_transactions SET status='PROCESSING' WHERE id=?",[transitionId]);
   for(const stateName of ['FAILED','CANCELLED','EXPIRED','REFUNDED'])await assert.rejects(transitionPayment(transitionId,stateName,'admin'),/Invalid payment transition/);
   s=await state(transitionId);assert.equal(s.payment.status,'PROCESSING');assert.equal(s.reservation.status,'ACTIVE');

   gateway.initiationOutcome='accept';
   const refundMember=await member('RefundLease');
   const refundIntent=await createPaymentIntent({actingUserId:refundMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`refund-${key}`});
   gateway.responses.set(refundIntent.payment.reference,{providerReference:refundIntent.payment.reference,providerTransactionId:`txn-refund-${key}`,state:'SUCCESS',amount:40000,currency:'TZS',memberReference:refundIntent.payment.reference});
   assert.equal((await settlePayment(refundIntent.payment.id,'test')).status,'SUCCESS');
   const [allocation]=await db.query('SELECT id,amount FROM payment_cycle_allocations WHERE payment_id=?',[refundIntent.payment.id]);
   const [requestSeed]=await db.query('SELECT id FROM payment_refund_requests WHERE payment_id=?',[refundIntent.payment.id]);
   assert.equal(requestSeed.length,0);
   await db.query(`INSERT INTO payment_refund_requests(request_key,payment_id,amount,reason,status,requested_by,allocation_ids,provider_refund_reference,lease_expires_at,created_at,updated_at) VALUES(?,?,?,?, 'PENDING_PROVIDER',?,?,?,DATE_SUB(NOW(),INTERVAL 1 SECOND),NOW(),NOW())`,[`refund-${refundIntent.payment.id}-${allocation[0].id}`,refundIntent.payment.id,allocation[0].amount,'seed',admin[0].id,JSON.stringify([allocation[0].id]),'provider-ref-'+key]);
   await db.query('UPDATE payment_cycle_allocations SET status=? WHERE id=?',['REFUNDING',allocation[0].id]);
   gateway.refundReferences.add(`provider-ref-${key}`);
   const recoveredRefund=await refundPaymentAllocations({paymentId:refundIntent.payment.id,allocationIds:[allocation[0].id],amount:Number(allocation[0].amount),reason:'stale claim',actorId:admin[0].id,actorType:'admin',workerAuth});
   assert.ok(recoveredRefund.refundId);assert.equal(gateway.refundInitiations,0);

   const uncertainMember=await member('RefundUncertain');
   const uncertainIntent=await createPaymentIntent({actingUserId:uncertainMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`uncertain-refund-${key}`});
   gateway.responses.set(uncertainIntent.payment.reference,{providerReference:uncertainIntent.payment.reference,providerTransactionId:`txn-uncertain-${key}`,state:'SUCCESS',amount:40000,currency:'TZS',memberReference:uncertainIntent.payment.reference});
   assert.equal((await settlePayment(uncertainIntent.payment.id,'test')).status,'SUCCESS');
   const [uncertainAllocation]=await db.query('SELECT id,amount FROM payment_cycle_allocations WHERE payment_id=?',[uncertainIntent.payment.id]);
   gateway.initiateRefund=async()=>{throw new Error('Provider refund timeout')};
   await assert.rejects(refundPaymentAllocations({paymentId:uncertainIntent.payment.id,allocationIds:[uncertainAllocation[0].id],amount:Number(uncertainAllocation[0].amount),reason:'timeout',actorId:admin[0].id,actorType:'admin'}),/timeout/);
   await assert.rejects(refundPaymentAllocations({paymentId:uncertainIntent.payment.id,allocationIds:[uncertainAllocation[0].id],amount:Number(uncertainAllocation[0].amount),reason:'timeout',actorId:admin[0].id,actorType:'admin',workerAuth}),/reconciliation/);

   const env={...process.env,MYSQL_DATABASE:'phase1a_test',JWT_SECRET:'0123456789abcdef0123456789abcdef'};
   const concurrentMember=await member('RefundConcurrent');
   const concurrentIntent=await createPaymentIntent({actingUserId:concurrentMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`concurrent-refund-${key}`});
   gateway.responses.set(concurrentIntent.payment.reference,{providerReference:concurrentIntent.payment.reference,providerTransactionId:`txn-conc-${key}`,state:'SUCCESS',amount:40000,currency:'TZS',memberReference:concurrentIntent.payment.reference});
   assert.equal((await settlePayment(concurrentIntent.payment.id,'test')).status,'SUCCESS');
   const [concurrentAllocation]=await db.query('SELECT id,amount FROM payment_cycle_allocations WHERE payment_id=?',[concurrentIntent.payment.id]);
   const [ra,rb]=await Promise.all([
     worker(env,['refund',String(concurrentIntent.payment.id),concurrentIntent.payment.reference,String(concurrentAllocation[0].amount),'',String(concurrentAllocation[0].id),String(admin[0].id)]),
     worker(env,['refund',String(concurrentIntent.payment.id),concurrentIntent.payment.reference,String(concurrentAllocation[0].amount),'',String(concurrentAllocation[0].id),String(admin[0].id)])
   ]);
   assert.equal((ra.ok===true)+(rb.ok===true),1,JSON.stringify({ra,rb}));
 }finally{await db.end();await pool.end()}
});

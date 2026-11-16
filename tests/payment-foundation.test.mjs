import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

test('phase1a payment foundation: three-cycle settlement and allocation refund', { skip: process.env.PHASE1A_TEST_DB !== '1' }, async () => {
  const mysql = (await import('mysql2/promise')).default;
  const { TestPaymentGateway, registerGateway } = await import('../lib/payments/gateways.ts');
  const { createPaymentIntent, processGatewayNotification, refundPaymentAllocations } = await import('../lib/payments/service.ts');
  const { pool } = await import('../lib/db.ts');
  const db = mysql.createPool({ host:'localhost', port:3306, user:'root', password:'', database:'phase1a_test', ssl:false });
  const key = Date.now();
  const WORKER_KEY=`phase1f-worker-${key}`;const WORKER_SECRET=`phase1f-secret-${key}`;const workerAuth={workerKey:WORKER_KEY,workerSecret:WORKER_SECRET};
  try {
    const [[dbName]] = await db.query('SELECT DATABASE() AS db');
    assert.equal(dbName.db, 'phase1a_test');
    const [user] = await db.query("INSERT INTO users (name,email,password,user_category,role,is_approved,created_at,updated_at) VALUES ('Phase1A Test',?,'hash','regular','member',1,NOW(),NOW())", [`phase1a.auto.${key}@example.invalid`]);
    const [memberUser] = await db.query("INSERT INTO users (name,email,password,user_category,role,is_approved,created_at,updated_at) VALUES ('Phase1A Non Admin',?,'hash','regular','member',1,NOW(),NOW())", [`phase1a.member.${key}@example.invalid`]);
    const [admin] = await db.query('SELECT id FROM users WHERE is_admin=1 ORDER BY id LIMIT 1');
    const memberId = user.insertId;
    const gateway = new TestPaymentGateway(); registerGateway(gateway);
    await db.query('INSERT INTO payment_recovery_workers(worker_key,secret_hash,is_active) VALUES(?,?,1)',[WORKER_KEY,createHash('sha256').update(WORKER_SECRET).digest('hex')]);
    const intent = await createPaymentIntent({ actingUserId:memberId, providerCode:'test-gateway', cycleYears:[2026,2027,2028], idempotencyKey:`phase1a-${key}` });
    assert.equal(intent.payment.status, 'PROCESSING');
    assert.equal(intent.allocations.length, 3);
    const amount = intent.allocations.reduce((sum,row)=>sum+Number(row.totalDue),0);
    assert.equal(amount, 100000);
    gateway.responses.set(intent.payment.reference,{providerReference:intent.payment.reference,providerTransactionId:`txn-${key}`,state:'SUCCESS',amount,currency:'TZS',memberReference:intent.payment.reference});
    const body=JSON.stringify({reference:intent.payment.reference,eventId:`evt-${key}`});
    const [first,second]=await Promise.all([
      processGatewayNotification({providerCode:'test-gateway',headers:{},rawBody:body}),
      processGatewayNotification({providerCode:'test-gateway',headers:{},rawBody:body})
    ]);
    const results=[first,second];
    assert.equal(results.filter(x=>x.status==='SUCCESS' || x.duplicate===true).length,2);
    assert.ok(results.some(x=>x.duplicate===true || x.status==='SUCCESS'));
    const [payment]=await db.query('SELECT status,provider_transaction_id FROM payment_transactions WHERE id=?',[intent.payment.id]);
    assert.equal(payment[0].status,'SUCCESS');
    assert.equal(payment[0].provider_transaction_id,`txn-${key}`);
    const [allocations]=await db.query('SELECT id,cycle_year,amount,status FROM payment_cycle_allocations WHERE payment_id=? ORDER BY cycle_year',[intent.payment.id]);
    assert.equal(allocations.length,3);
    assert.deepEqual(allocations.map(x=>x.status),['PAID','PAID','PAID']);
    const [entitlements]=await db.query('SELECT cycle_year,entitlement_status FROM membership_cycle_entitlements WHERE user_id=? ORDER BY cycle_year',[memberId]);
    assert.deepEqual(entitlements.map(x=>x.entitlement_status),['active','active','active']);
    const refundTarget=allocations[0];
    await assert.rejects(refundPaymentAllocations({paymentId:intent.payment.id,allocationIds:[refundTarget.id],amount:Number(refundTarget.amount)+1,reason:'bad',actorId:admin[0].id,actorType:'admin'}),/Refund amount/);
    await assert.rejects(refundPaymentAllocations({paymentId:intent.payment.id,allocationIds:[999999],amount:1,reason:'bad',actorId:admin[0].id,actorType:'admin'}),/Invalid or already-refunded/);
    await assert.rejects(refundPaymentAllocations({paymentId:intent.payment.id,allocationIds:[refundTarget.id],amount:Number(refundTarget.amount),reason:'bad',actorId:memberUser.insertId,actorType:'admin'}),/Unauthorized refund actor/);
    await assert.rejects(refundPaymentAllocations({paymentId:intent.payment.id,allocationIds:[refundTarget.id],amount:Number(refundTarget.amount),reason:'bad',actorId:admin[0].id,actorType:'manual_approver'}),/approval reference/);
    gateway.refundConfirmed=false;
    await assert.rejects(refundPaymentAllocations({paymentId:intent.payment.id,allocationIds:[refundTarget.id],amount:Number(refundTarget.amount),reason:'unconfirmed',actorId:admin[0].id,actorType:'admin'}),/not confirmed/);
    const [noRefund]=await db.query('SELECT COUNT(*) c FROM payment_refunds WHERE payment_id=?',[intent.payment.id]);
    assert.equal(noRefund[0].c,0);
    await db.query("UPDATE payment_refund_requests SET status='PROVIDER_CONFIRMED',confirmed_at=NOW(),next_attempt_at=NULL WHERE payment_id=?",[intent.payment.id]);
    const refund=await refundPaymentAllocations({paymentId:intent.payment.id,allocationIds:[refundTarget.id],amount:Number(refundTarget.amount),reason:'Automated Phase 1A test',actorId:admin[0].id,actorType:'admin',workerAuth});
    assert.equal(refund.remainingAllocations,2);
    assert.equal(gateway.refundInitiations,1);
    const [requestRows]=await db.query('SELECT status,provider_refund_reference,confirmed_at,completed_at FROM payment_refund_requests WHERE id=?',[refund.requestId]);
    assert.equal(requestRows[0].status,'COMPLETED');
    assert.ok(requestRows[0].provider_refund_reference);
    assert.ok(requestRows[0].confirmed_at);
    assert.ok(requestRows[0].completed_at);
    const [refundRows]=await db.query('SELECT r.status,r.amount,r.provider_refund_reference FROM payment_refunds r WHERE r.id=?',[refund.refundId]);
    assert.equal(refundRows[0].status,'CONFIRMED');
    const [after]=await db.query('SELECT a.cycle_year,a.status,e.entitlement_status FROM payment_cycle_allocations a JOIN membership_cycle_entitlements e ON e.payment_allocation_id=a.id WHERE a.payment_id=? ORDER BY a.cycle_year',[intent.payment.id]);
    assert.deepEqual(after.map(x=>x.entitlement_status),['reversed','active','active']);
    const [reservationAfterRefund]=await db.query('SELECT cycle_year,status FROM payment_cycle_reservations WHERE user_id=? ORDER BY cycle_year',[memberId]);
    assert.deepEqual(reservationAfterRefund.map(x=>x.status),['RELEASED','SETTLED','SETTLED']);
    await assert.rejects(refundPaymentAllocations({paymentId:intent.payment.id,allocationIds:[refundTarget.id],amount:Number(refundTarget.amount),reason:'repeat',actorId:admin[0].id,actorType:'admin',workerAuth}),/Invalid or already-refunded/);
    const [finalPayment]=await db.query('SELECT status,amount FROM payment_transactions WHERE id=?',[intent.payment.id]);
    assert.equal(finalPayment[0].status,'SUCCESS');
    assert.equal(Number(finalPayment[0].amount),amount);

    const repayment=await createPaymentIntent({actingUserId:memberId,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`repay-${key}`});
    gateway.responses.set(repayment.payment.reference,{providerReference:repayment.payment.reference,providerTransactionId:`txn-repay-${key}`,state:'SUCCESS',amount:repayment.payment.amount?Number(repayment.payment.amount):Number(repayment.allocations[0].totalDue),currency:'TZS',memberReference:repayment.payment.reference});
    const {settlePayment}=await import('../lib/payments/service.ts');
    assert.equal((await settlePayment(repayment.payment.id,'test')).status,'SUCCESS');
    const [repaidEntitlement]=await db.query('SELECT e.entitlement_status,e.payment_allocation_id FROM membership_cycle_entitlements e WHERE e.user_id=? AND e.cycle_year=2026',[memberId]);
    assert.equal(repaidEntitlement[0].entitlement_status,'active');
    assert.notEqual(repaidEntitlement[0].payment_allocation_id,refundTarget.id);

    gateway.refundConfirmed=true;
    const secondProviderTarget=allocations[1];
    const secondProviderRefund=await refundPaymentAllocations({paymentId:intent.payment.id,allocationIds:[secondProviderTarget.id],amount:Number(secondProviderTarget.amount),reason:'Second provider refund',actorId:admin[0].id,actorType:'admin'});
    const [providerRefundRows]=await db.query('SELECT provider_refund_reference FROM payment_refunds WHERE id IN (?,?) ORDER BY id',[refund.refundId,secondProviderRefund.refundId]);
    assert.notEqual(providerRefundRows[0].provider_refund_reference,providerRefundRows[1].provider_refund_reference);
    assert.equal(gateway.refundInitiations,2);

    const manualTarget=allocations[2];
    const evidence=`manual-evidence-${key}`;
    const manualRefund=await refundPaymentAllocations({paymentId:intent.payment.id,allocationIds:[manualTarget.id],amount:Number(manualTarget.amount),reason:'Manual Phase 1A test',actorId:admin[0].id,actorType:'manual_approver',manualApprovalId:`approval-${key}`,evidence});
    const [manualRows]=await db.query('SELECT status,evidence_hash,provider_refund_reference,confirmed_at FROM payment_refunds WHERE id=?',[manualRefund.refundId]);
    assert.equal(manualRows[0].status,'CONFIRMED');
    assert.equal(manualRows[0].provider_refund_reference,`MANUAL-approval-${key}`);
    assert.ok(manualRows[0].evidence_hash);
    assert.ok(manualRows[0].confirmed_at);
    const [auditRows]=await db.query("SELECT actor_type,actor_id,created_at FROM payment_audit_events WHERE payment_id=? AND event_type='REFUND_CONFIRMED' ORDER BY id DESC LIMIT 1",[intent.payment.id]);
    assert.equal(auditRows[0].actor_type,'manual_approver');
    assert.equal(auditRows[0].actor_id,admin[0].id);
    assert.ok(auditRows[0].created_at);
    const [manualAfter]=await db.query('SELECT status FROM payment_cycle_allocations WHERE payment_id=? ORDER BY cycle_year',[intent.payment.id]);
    assert.deepEqual(manualAfter.map(x=>x.status),['REFUNDED','REFUNDED','REFUNDED']);
    const [repaidAfter]=await db.query('SELECT entitlement_status FROM membership_cycle_entitlements WHERE payment_allocation_id=(SELECT id FROM payment_cycle_allocations WHERE payment_id=?)',[repayment.payment.id]);
    assert.equal(repaidAfter[0].entitlement_status,'active');
  } finally {
    await db.end();
    await pool.end();
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';

test('phase1a expanded payment validation and rollback', { skip: process.env.PHASE1A_TEST_DB !== '1' }, async () => {
  const mysql=(await import('mysql2/promise')).default;
  const {TestPaymentGateway,registerGateway}=await import('../lib/payments/gateways.ts');
  const {createPaymentIntent,settlePayment,transitionPayment,processGatewayNotification}=await import('../lib/payments/service.ts');
  const {pool}=await import('../lib/db.ts');
  const db=mysql.createPool({host:'localhost',port:3306,user:'root',password:'',database:'phase1a_test',ssl:false});
  const key=Date.now();
  try{
    const [[dn]]=await db.query('SELECT DATABASE() db');assert.equal(dn.db,'phase1a_test');
    await db.query("INSERT INTO users(name,email,password,user_category,role,is_approved,created_at,updated_at) VALUES('Phase1A Validation',?,'hash','regular','member',1,NOW(),NOW())",[`phase1a.validation.${key}@example.invalid`]);
    const [u2]=await db.query("INSERT INTO users(name,email,password,user_category,role,is_approved,created_at,updated_at) VALUES('Phase1A Validation 2',?,'hash','regular','member',1,NOW(),NOW())",[`phase1a.validation2.${key}@example.invalid`]);
    const member2Id=u2.insertId;const gateway=new TestPaymentGateway();registerGateway(gateway);
    async function newMember(name){const [r]=await db.query("INSERT INTO users(name,email,password,user_category,role,is_approved,created_at,updated_at) VALUES(?,?,'hash','regular','member',1,NOW(),NOW())",[name,`phase1a.${name.replace(/\W/g,'').toLowerCase()}.${key}.${Math.random()}@example.invalid`]);return r.insertId}
    async function intent(idem,member){const actingMember=member??await newMember(`Member ${idem}`);return createPaymentIntent({actingUserId:actingMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:idem})}
    async function expectReject(payment,verification,pattern){
      gateway.responses.set(payment.payment.reference,verification);
      await assert.rejects(settlePayment(payment.payment.id,'test'),pattern);
      const [rows]=await db.query('SELECT p.status,a.status allocation_status FROM payment_transactions p JOIN payment_cycle_allocations a ON a.payment_id=p.id WHERE p.id=?',[payment.payment.id]);
      assert.ok(['PROCESSING','RECONCILIATION_REQUIRED'].includes(rows[0].status));assert.equal(rows[0].allocation_status,'ALLOCATED');
    }
    let p=await intent(`bad-currency-${key}`);
    await expectReject(p,{providerReference:p.payment.reference,state:'SUCCESS',amount:40000,currency:'USD',memberReference:p.payment.reference},/amount or currency/);
    p=await intent(`bad-member-${key}`);
    await expectReject(p,{providerReference:p.payment.reference,state:'SUCCESS',amount:40000,currency:'TZS',memberReference:'OTHER'},/member reference/);
    p=await intent(`bad-provider-${key}`);
    await expectReject(p,{providerReference:'OTHER-REF',state:'SUCCESS',amount:40000,currency:'TZS',memberReference:p.payment.reference},/provider reference/);
    await assert.rejects(settlePayment(99999999,'test'),/Payment not found/);
    p=await intent(`wrong-state-${key}`);
    await assert.rejects(transitionPayment(p.payment.id,'SUCCESS','admin'),/Invalid payment transition/);
    await db.query('UPDATE payment_transactions SET expires_at=DATE_SUB(NOW(),INTERVAL 1 MINUTE) WHERE id=?',[p.payment.id]);
    gateway.responses.set(p.payment.reference,{providerReference:p.payment.reference,providerTransactionId:`txn-expired-${key}`,state:'EXPIRED',amount:40000,currency:'TZS',memberReference:p.payment.reference});
    const expired=await settlePayment(p.payment.id,'test');assert.equal(expired.status,'EXPIRED');
    p=await intent(`good-${key}`);
    gateway.responses.set(p.payment.reference,{providerReference:p.payment.reference,providerTransactionId:`txn-shared-${key}`,state:'SUCCESS',amount:40000,currency:'TZS',memberReference:p.payment.reference});
    assert.equal((await settlePayment(p.payment.id,'test')).status,'SUCCESS');
    await assert.rejects(transitionPayment(p.payment.id,'REFUNDED','admin'),/Invalid payment transition/);
    const p2=await intent(`duplicate-txn-${key}`,member2Id);
    gateway.responses.set(p2.payment.reference,{providerReference:p2.payment.reference,providerTransactionId:`txn-shared-${key}`,state:'SUCCESS',amount:40000,currency:'TZS',memberReference:p2.payment.reference});
    await assert.rejects(settlePayment(p2.payment.id,'test'),/Duplicate provider transaction identity/);
    const [rollback]=await db.query('SELECT p.status,a.status allocation_status,e.id entitlement FROM payment_transactions p JOIN payment_cycle_allocations a ON a.payment_id=p.id LEFT JOIN membership_cycle_entitlements e ON e.payment_allocation_id=a.id WHERE p.id=?',[p2.payment.id]);
    assert.equal(rollback[0].status,'RECONCILIATION_REQUIRED');assert.equal(rollback[0].allocation_status,'ALLOCATED');assert.equal(rollback[0].entitlement,null);
    const [duplicateCase]=await db.query('SELECT status,provider_transaction_id FROM payment_reconciliation_cases WHERE payment_id=? AND case_type=?',[p2.payment.id,'DUPLICATE_PROVIDER_TRANSACTION']);
    assert.equal(duplicateCase[0].status,'OPEN');assert.equal(duplicateCase[0].provider_transaction_id,`txn-shared-${key}`);
    const p3=await intent(`notification-retry-${key}`);
    gateway.responses.set(p3.payment.reference,{providerReference:p3.payment.reference,providerTransactionId:`txn-retry-${key}`,state:'SUCCESS',amount:40000,currency:'TZS',memberReference:p3.payment.reference});
    assert.equal((await settlePayment(p3.payment.id,'direct')).status,'SUCCESS');
    const retry=await processGatewayNotification({providerCode:'test-gateway',headers:{},rawBody:JSON.stringify({reference:p3.payment.reference,eventId:`retry-${key}`})});
    assert.equal(retry.duplicate,true);
    const [retryEffects]=await db.query('SELECT COUNT(*) c FROM membership_cycle_entitlements WHERE payment_allocation_id IN (SELECT id FROM payment_cycle_allocations WHERE payment_id=?)',[p3.payment.id]);
    assert.equal(retryEffects[0].c,1);
    await assert.rejects(createPaymentIntent({actingUserId:p3.payment.id,memberId:member2Id,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`impersonate-${key}`}),/impersonation/);
    const [unapproved]=await db.query("INSERT INTO users(name,email,password,user_category,role,is_approved,created_at,updated_at) VALUES('Phase1B Unapproved',?,'hash','regular','member',0,NOW(),NOW())",[`phase1b.unapproved.${key}@example.invalid`]);
    await assert.rejects(createPaymentIntent({actingUserId:unapproved.insertId,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`unapproved-${key}`}),/not approved/);
    const competingMember=await newMember('Competing');
    const firstCompeting=await createPaymentIntent({actingUserId:competingMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`competing-a-${key}`});
    await assert.rejects(createPaymentIntent({actingUserId:competingMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`competing-b-${key}`}),/active payment reservation/);
    gateway.responses.set(firstCompeting.payment.reference,{providerReference:firstCompeting.payment.reference,state:'FAILED',amount:40000,currency:'TZS',memberReference:firstCompeting.payment.reference});
    assert.equal((await settlePayment(firstCompeting.payment.id,'test')).status,'FAILED');
    const retryAfterFailure=await createPaymentIntent({actingUserId:competingMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`competing-c-${key}`});
    gateway.responses.set(retryAfterFailure.payment.reference,{providerReference:retryAfterFailure.payment.reference,state:'SUCCESS',amount:40000,currency:'TZS',memberReference:retryAfterFailure.payment.reference});
    await assert.rejects(settlePayment(retryAfterFailure.payment.id,'test'),/provider transaction identity/);
    await db.query('UPDATE payment_cycle_reservations SET expires_at=DATE_SUB(NOW(),INTERVAL 1 MINUTE) WHERE payment_id=?',[retryAfterFailure.payment.id]);
    await assert.rejects(createPaymentIntent({actingUserId:competingMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`competing-d-${key}`}),/reconciliation/);
    gateway.responses.set(retryAfterFailure.payment.reference,{providerReference:retryAfterFailure.payment.reference,state:'FAILED',amount:40000,currency:'TZS',memberReference:retryAfterFailure.payment.reference});
    assert.equal((await settlePayment(retryAfterFailure.payment.id,'test')).status,'FAILED');
    const expiredIntent=await createPaymentIntent({actingUserId:competingMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`competing-e-${key}`});
    assert.ok(expiredIntent.payment.id);
    gateway.initiationFails=true;
    const failedMember=await newMember('Failed Initiation');
    await assert.rejects(createPaymentIntent({actingUserId:failedMember,providerCode:'test-gateway',cycleYears:[2026],idempotencyKey:`failed-init-${key}`}),/initiation failure/);
    const [failedReservation]=await db.query('SELECT status,payment_id FROM payment_cycle_reservations WHERE user_id=? AND cycle_year=2026',[failedMember]);
    assert.equal(failedReservation[0].status,'RELEASED');
    assert.equal(failedReservation[0].payment_id,null);
    gateway.initiationFails=false;
    await assert.rejects(processGatewayNotification({providerCode:'test-gateway',headers:{},rawBody:JSON.stringify({reference:p3.payment.reference})}),/event ID/);
    await db.query("UPDATE payment_transactions SET provider_code='wrong-provider' WHERE id=?",[p3.payment.id]);
    await assert.rejects(processGatewayNotification({providerCode:'test-gateway',headers:{},rawBody:JSON.stringify({reference:p3.payment.reference,eventId:`wrong-${key}`})}),/Unknown payment reference/);
    await db.query("UPDATE payment_transactions SET provider_code='test-gateway' WHERE id=?",[p3.payment.id]);
    const priorEnv=process.env.NODE_ENV;
    process.env.NODE_ENV='production';
    assert.throws(()=>registerGateway(new TestPaymentGateway()),/forbidden in production/);
    process.env.NODE_ENV=priorEnv;
  } finally{await db.end();await pool.end();}
});

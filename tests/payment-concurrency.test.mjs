import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

function worker(env, args) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['tests/phase1a-worker.mjs', ...args], { env, cwd: process.cwd() });
    let output='';
    child.stdout.on('data', d => output += d);
    child.stderr.on('data', d => output += d);
    child.on('close', () => resolve(JSON.parse(output.trim().split('\n').pop())));
  });
}

test('phase1a multi-process payment concurrency', { skip: process.env.PHASE1A_TEST_DB !== '1' }, async () => {
  const env = {...process.env, MYSQL_DATABASE:'phase1a_test', JWT_SECRET:'0123456789abcdef0123456789abcdef'};
  const mysql = (await import('mysql2/promise')).default;
  const { TestPaymentGateway, registerGateway } = await import('../lib/payments/gateways.ts');
  const { createPaymentIntent } = await import('../lib/payments/service.ts');
  const { pool } = await import('../lib/db.ts');
  const db = mysql.createPool({host:'localhost',port:3306,user:'root',password:'',database:'phase1a_test',ssl:false});
  const key=Date.now();
  try {
    const [[dbName]]=await db.query('SELECT DATABASE() db'); assert.equal(dbName.db,'phase1a_test');
    const [admin]=await db.query('SELECT id FROM users WHERE is_admin=1 ORDER BY id LIMIT 1');
    const [user]=await db.query("INSERT INTO users(name,email,password,user_category,role,is_approved,created_at,updated_at) VALUES('Phase1A Concurrent',?,'hash','regular','member',1,NOW(),NOW())",[`phase1a.concurrent.${key}@example.invalid`]);
    const memberId=user.insertId;
    const gateway=new TestPaymentGateway(); registerGateway(gateway);
    const [intentA,intentB]=await Promise.all([
      worker(env,['intent',String(memberId),`compete-a-${key}`,'2026']),
      worker(env,['intent',String(memberId),`compete-b-${key}`,'2026'])
    ]);
    assert.equal((intentA.ok===true)+(intentB.ok===true),1);
    assert.equal((intentA.ok===false)+(intentB.ok===false),1);
    const winning=intentA.ok?intentA:intentB;
    const competingPaymentId=winning.result.payment.id;
    gateway.responses.set(winning.result.payment.reference,{providerReference:winning.result.payment.reference,providerTransactionId:`txn-compete-${key}`,state:'SUCCESS',amount:40000,currency:'TZS',memberReference:winning.result.payment.reference});
    assert.equal((await (await import('../lib/payments/service.ts')).settlePayment(competingPaymentId,'test')).status,'SUCCESS');
    const [losingId]=await db.query('SELECT id FROM payment_transactions WHERE user_id=? AND id<>? AND status IN (\'PENDING\',\'PROCESSING\') ORDER BY id DESC LIMIT 1',[memberId,competingPaymentId]);
    if(losingId[0])await assert.rejects((await import('../lib/payments/service.ts')).settlePayment(losingId[0].id,'test'),/reservation/);
    const intent=await createPaymentIntent({actingUserId:memberId,providerCode:'test-gateway',cycleYears:[2027],idempotencyKey:`phase1a-conc-${key}`});
    const args=[String(intent.payment.id),intent.payment.reference,String(intent.allocations[0].totalDue)];
    const [sameSettleA,sameSettleB]=await Promise.all([worker(env,['settle',...args]),worker(env,['settle',...args])]);
    assert.equal(sameSettleA.ok || sameSettleB.ok,true);
    assert.equal((sameSettleA.result?.status==='SUCCESS')+(sameSettleB.result?.status==='SUCCESS'),1);
    assert.equal((sameSettleA.result?.duplicate===true)+(sameSettleB.result?.duplicate===true),1);
    const [allocations]=await db.query('SELECT id,amount,status FROM payment_cycle_allocations WHERE payment_id=?',[intent.payment.id]);
    const [entitlements]=await db.query('SELECT e.entitlement_status FROM membership_cycle_entitlements e JOIN payment_cycle_allocations a ON a.id=e.payment_allocation_id WHERE e.user_id=? AND a.payment_id=?',[memberId,intent.payment.id]);
    assert.equal(entitlements.filter(x=>x.entitlement_status==='active').length,1);
    const [refundA,refundB]=await Promise.all([
      worker(env,['refund',String(intent.payment.id),intent.payment.reference,String(allocations[0].amount),'',String(allocations[0].id),String(admin[0].id)]),
      worker(env,['refund',String(intent.payment.id),intent.payment.reference,String(allocations[0].amount),'',String(allocations[0].id),String(admin[0].id)])
    ]);
    assert.equal((refundA.ok===true)+(refundB.ok===true),1,JSON.stringify({refundA,refundB}));
    assert.equal((refundA.ok===false)+(refundB.ok===false),1,JSON.stringify({refundA,refundB}));
    const [refunds]=await db.query('SELECT COUNT(*) c FROM payment_refunds WHERE payment_id=?',[intent.payment.id]);
    assert.equal(refunds[0].c,1);
    assert.equal((await db.query('SELECT entitlement_status FROM membership_cycle_entitlements WHERE payment_allocation_id=?',[allocations[0].id]))[0][0].entitlement_status,'reversed');

    const notifyIntent=await createPaymentIntent({actingUserId:memberId,providerCode:'test-gateway',cycleYears:[2028],idempotencyKey:`phase1a-notify-${key}`});
    const notifyArgs=[String(notifyIntent.payment.id),notifyIntent.payment.reference,String(notifyIntent.allocations[0].totalDue)];
    const [sameEventA,sameEventB]=await Promise.all([
      worker(env,['notify',...notifyArgs,`same-${key}`]),
      worker(env,['notify',...notifyArgs,`same-${key}`])
    ]);
    assert.equal([sameEventA,sameEventB].filter(x=>x.ok).length,2,JSON.stringify({sameEventA,sameEventB}));
    const [notificationRows]=await db.query('SELECT COUNT(*) c FROM payment_notifications WHERE payment_id=?',[notifyIntent.payment.id]);
    assert.equal(notificationRows[0].c,1);

    const differentIntent=await createPaymentIntent({actingUserId:memberId,providerCode:'test-gateway',cycleYears:[2029],idempotencyKey:`phase1a-different-${key}`});
    const differentArgs=[String(differentIntent.payment.id),differentIntent.payment.reference,String(differentIntent.allocations[0].totalDue)];
    const [differentA,differentB]=await Promise.all([
      worker(env,['notify',...differentArgs,`different-a-${key}`]),
      worker(env,['notify',...differentArgs,`different-b-${key}`])
    ]);
    assert.equal([differentA,differentB].filter(x=>x.ok).length,2);
    const [differentPayment]=await db.query('SELECT status FROM payment_transactions WHERE id=?',[differentIntent.payment.id]);
    assert.equal(differentPayment[0].status,'SUCCESS');
  } finally { await db.end(); await pool.end(); }
});

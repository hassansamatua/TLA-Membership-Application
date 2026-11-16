const action = process.argv[2];
const [,,, paymentId, reference, amount, eventId, allocationId, actorId] = process.argv;
const { TestPaymentGateway, registerGateway } = await import('../lib/payments/gateways.ts');
const service = await import('../lib/payments/service.ts');
const { pool } = await import('../lib/db.ts');
try {
  const [[db]] = await pool.query('SELECT DATABASE() AS db');
  if (db.db !== 'phase1a_test') throw new Error('Wrong database');
  const gateway = new TestPaymentGateway();
  registerGateway(gateway);
  if (['settle','notify'].includes(action)) {
    gateway.responses.set(reference, { providerReference: reference, providerTransactionId: `txn-${reference}`, state:'SUCCESS', amount:Number(amount), currency:'TZS', memberReference:reference });
  }
  let result;
  if (action === 'intent') result = await service.createPaymentIntent({actingUserId:Number(paymentId),providerCode:'test-gateway',cycleYears:[Number(amount)],idempotencyKey:reference});
  else if (action === 'settle') result = await service.settlePayment(Number(paymentId), 'worker');
  else if (action === 'notify') result = await service.processGatewayNotification({ providerCode:'test-gateway', headers:{}, rawBody:JSON.stringify({reference,eventId}) });
  else if (action === 'refund') result = await service.refundPaymentAllocations({paymentId:Number(paymentId),allocationIds:[Number(allocationId)],amount:Number(amount),reason:'concurrency',actorId:Number(actorId),actorType:'admin'});
  else if (action === 'sweep-init') { gateway.initiatedSessions.add(reference); result = await service.sweepPaymentLeases({workerKey:process.env.RECOVERY_WORKER_KEY,workerSecret:process.env.RECOVERY_WORKER_SECRET,workerId:eventId,paymentId:Number(paymentId),maxAttempts:5}); }
  else if (action === 'sweep-refund') { gateway.refundReferences.add(reference); result = await service.sweepPaymentLeases({workerKey:process.env.RECOVERY_WORKER_KEY,workerSecret:process.env.RECOVERY_WORKER_SECRET,workerId:eventId,refundRequestId:Number(paymentId),maxAttempts:5}); }
  else if (action === 'sweep-all') { gateway.refundReferences.add(reference); gateway.initiatedSessions.add(reference); result = await service.sweepPaymentLeases({workerKey:process.env.RECOVERY_WORKER_KEY,workerSecret:process.env.RECOVERY_WORKER_SECRET,workerId:eventId,limit:Number(amount)||10,maxAttempts:5}); }
  else throw new Error('Unknown action');
  console.log(JSON.stringify({ok:true,result}));
} catch (error) {
  console.log(JSON.stringify({ok:false,error:error.message}));
} finally {
  await pool.end();
}

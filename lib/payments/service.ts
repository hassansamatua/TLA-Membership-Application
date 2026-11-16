import { createHash, randomUUID } from 'node:crypto';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../db.ts';
import { listFutureUnpaidCycles } from '../enhancedMembershipCycles.ts';
import { getGateway } from './gateways.ts';
import type { CycleQuote, PaymentState } from './types.ts';

const FINAL_STATES: PaymentState[] = ['FAILED', 'CANCELLED', 'EXPIRED'];
const transitions: Record<PaymentState, PaymentState[]> = {
  PENDING: ['PROCESSING'],
  PROCESSING: ['VERIFICATION_REQUIRED'],
  VERIFICATION_REQUIRED: [],
  SUCCESS: [],
  FAILED: [],
  CANCELLED: [],
  EXPIRED: [],
  REFUNDED: [],
  RECONCILIATION_REQUIRED: []
};
const RESERVATION_MINUTES = 30;
const LEASE_SECONDS = 120;
const MAX_RECOVERY_ATTEMPTS = 5;

function reference() { return `TLA-PAY-${randomUUID()}`; }
function auditHash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function sqlErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : undefined;
}
function isDefiniteRejection(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'definiteRejection' in error && (error as { definiteRejection?: unknown }).definiteRejection === true;
}
async function audit(connection: PoolConnection, paymentId: number | null, event: string, actor: string, data: unknown, actorId: number | null = null, correlationId: string | null = null) {
  await connection.query('INSERT INTO payment_audit_events(payment_id,event_type,actor_type,actor_id,event_hash,correlation_id,event_data,created_at) VALUES(?,?,?,?,?,?,?,NOW())',[paymentId,event,actor,actorId,auditHash({event,actor,data}),correlationId,JSON.stringify(data)]);
}
async function directAudit(paymentId:number|null,event:string,actor:string,data:unknown,actorId:number|null=null,correlationId:string|null=null){
  await pool.query('INSERT INTO payment_audit_events(payment_id,event_type,actor_type,actor_id,event_hash,correlation_id,event_data,created_at) VALUES(?,?,?,?,?,?,?,NOW())',[paymentId,event,actor,actorId,auditHash({event,actor,data}),correlationId,JSON.stringify(data)]);
}
async function releaseReservations(connection: PoolConnection, paymentId: number, status: 'RELEASED'|'CANCELLED'|'EXPIRED') {
  const [reservations]=await connection.query<RowDataPacket[]>('SELECT cycle_year FROM payment_cycle_reservations WHERE payment_id=? AND status=\'ACTIVE\' FOR UPDATE',[paymentId]);
  if(!reservations.length)return;
  await connection.query('UPDATE payment_cycle_reservations SET status=?,payment_id=NULL,updated_at=NOW() WHERE payment_id=? AND status=\'ACTIVE\'',[status,paymentId]);
  await audit(connection,paymentId,'RESERVATIONS_RELEASED','system',{status,cycles:reservations.map(x=>x.cycle_year)});
}
async function terminalPayment(connection: PoolConnection, paymentId: number, next: PaymentState, actor: string, data: unknown, release: 'RELEASED'|'CANCELLED'|'EXPIRED', expected?:PaymentState[]) {
  const col=next==='FAILED'?'failed_at':next==='CANCELLED'?'cancelled_at':next==='EXPIRED'?'expired_at':next==='REFUNDED'?'refunded_at':'succeeded_at';
  const condition=expected?` AND status IN (${expected.map(()=>'?').join(',')})`:'';
  const [r]=await connection.query<ResultSetHeader>(`UPDATE payment_transactions SET status=?,${col}=NOW(),updated_at=NOW() WHERE id=?${condition}`,[next,paymentId,...(expected||[])]);
  if(expected&&!r.affectedRows)throw new Error(`Payment is no longer eligible for ${next}`);
  if(['FAILED','CANCELLED','EXPIRED'].includes(next))await releaseReservations(connection,paymentId,release);
  await audit(connection,paymentId,`PAYMENT_${next}`,actor,data);
}
async function openReconciliation(connection: PoolConnection, paymentId: number, type: string, evidence: unknown, providerReference: string|null, providerTransactionId: string|null, subjectType='PAYMENT', subjectId:number|null=null) {
  const serialized=JSON.stringify(evidence);
  const [active]=await connection.query<RowDataPacket[]>('SELECT id FROM payment_reconciliation_cases WHERE payment_id=? AND case_type=? AND status IN (\'OPEN\',\'ASSIGNED\',\'ESCALATED\') ORDER BY recurrence_index,id LIMIT 1 FOR UPDATE',[paymentId,type]);
  if(active[0]){
    await connection.query(`UPDATE payment_reconciliation_cases SET provider_reference=COALESCE(provider_reference,?),provider_transaction_id=COALESCE(provider_transaction_id,?),evidence=?,evidence_history=JSON_ARRAY_APPEND(COALESCE(evidence_history,JSON_ARRAY()),'$',?),updated_at=NOW() WHERE id=?`,[providerReference,providerTransactionId,serialized,serialized,active[0].id]);
    return Number(active[0].id);
  }
  const [previous]=await connection.query<RowDataPacket[]>('SELECT id,recurrence_index FROM payment_reconciliation_cases WHERE payment_id=? AND case_type=? ORDER BY recurrence_index DESC,id DESC LIMIT 1 FOR UPDATE',[paymentId,type]);
  const recurrenceIndex=previous[0]?Number(previous[0].recurrence_index)+1:0;
  const [created]=await connection.query<ResultSetHeader>('INSERT INTO payment_reconciliation_cases(payment_id,subject_type,subject_id,case_type,recurrence_index,parent_case_id,status,provider_reference,provider_transaction_id,evidence,evidence_history,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())',[paymentId,subjectType,subjectId,type,recurrenceIndex,previous[0]?.id||null,'OPEN',providerReference,providerTransactionId,serialized,JSON.stringify([evidence])]);
  await audit(connection,paymentId,'RECONCILIATION_OPENED','system',{type,subjectType,subjectId,evidence,recurrenceIndex,parentCaseId:previous[0]?.id||null});
  return Number(created.insertId);
}
async function markPaymentReconciliation(connection: PoolConnection, payment: RowDataPacket, type: string, evidence: unknown, actor: string, providerTransactionId: string|null = null, persistOnPayment = true) {
  await connection.query("UPDATE payment_transactions SET status='RECONCILIATION_REQUIRED',provider_transaction_id=COALESCE(?,provider_transaction_id),updated_at=NOW() WHERE id=?",[persistOnPayment?providerTransactionId:null,payment.id]);
  await openReconciliation(connection,payment.id,type,evidence,payment.provider_reference||payment.reference,providerTransactionId);
  await audit(connection,payment.id,'PAYMENT_RECONCILIATION_REQUIRED',actor,evidence);
}
async function markRefundReconciliation(c:PoolConnection,requestId:number,paymentId:number,type:string,evidence:unknown,actor='system'){
  const [r]=await c.query<RowDataPacket[]>('SELECT provider_refund_reference FROM payment_refund_requests WHERE id=? FOR UPDATE',[requestId]);
  await openReconciliation(c,paymentId,type,evidence,null,r[0]?.provider_refund_reference||null,'REFUND_REQUEST',requestId);
  await audit(c,paymentId,'REFUND_RECONCILIATION_REQUIRED',actor,evidence);
}
async function membershipType(connection: PoolConnection, userId: number) {
  const [rows] = await connection.query<RowDataPacket[]>('SELECT membership_type,user_category FROM users WHERE id=?',[userId]);
  return rows[0]?.membership_type === 'organization' || rows[0]?.user_category === 'organization' ? 'organization' : 'personal';
}
async function nextMembershipNumber(connection: PoolConnection) {
  const year = new Date().getFullYear().toString().slice(-2);
  const [rows] = await connection.query<RowDataPacket[]>('SELECT last_number FROM membership_sequence WHERE year=? FOR UPDATE',[year]);
  const next = rows.length ? Number(rows[0].last_number)+1 : 1;
  if (rows.length) await connection.query('UPDATE membership_sequence SET last_number=? WHERE year=?',[next,year]);
  else await connection.query('INSERT INTO membership_sequence(year,last_number) VALUES (?,?)',[year,next]);
  return `TLA${year}${String(next).padStart(5,'0')}`;
}
async function refreshMembershipProjection(connection: PoolConnection, userId: number) {
  const [ent] = await connection.query<RowDataPacket[]>(`SELECT MAX(e.cycle_year) max_cycle,COALESCE(SUM(a.amount),0) paid FROM membership_cycle_entitlements e JOIN payment_cycle_allocations a ON a.id=e.payment_allocation_id WHERE e.user_id=? AND e.entitlement_status='active'`,[userId]);
  const maxCycle = ent[0]?.max_cycle == null ? null : Number(ent[0].max_cycle);
  const paidAmount = Number(ent[0]?.paid || 0);
  const [existing] = await connection.query<RowDataPacket[]>('SELECT id FROM memberships WHERE user_id=? ORDER BY expiry_date DESC LIMIT 1 FOR UPDATE',[userId]);
  if (!existing[0]) {
    if (!maxCycle) return;
    const [membershipNumber,type] = [await nextMembershipNumber(connection),await membershipType(connection,userId)];
    await connection.query(`INSERT INTO memberships(user_id,membership_number,membership_type,status,payment_status,joined_date,expiry_date,amount_paid,cycle_year,created_at,updated_at) VALUES(?,?,'${type}','active','paid',CURDATE(),?,?,?,NOW(),NOW())`,[userId,membershipNumber,`${maxCycle+1}-01-31`,paidAmount,maxCycle]);
    return;
  }
  if (maxCycle) await connection.query(`UPDATE memberships SET status='active',payment_status='paid',expiry_date=?,amount_paid=?,cycle_year=?,updated_at=NOW() WHERE id=?`,[`${maxCycle+1}-01-31`,paidAmount,maxCycle,existing[0].id]);
  else await connection.query(`UPDATE memberships SET status='expired',payment_status='overdue',updated_at=NOW() WHERE id=?`,[existing[0].id]);
}

type InitiationOutcome='PROVIDER_ACCEPTED'|'DEFINITE_REJECTION'|'OUTCOME_UNKNOWN';
async function lockOwnedInitiation(c:PoolConnection,paymentId:number,owner:string,expectedStatus:'PENDING_PROVIDER'|'RECONCILING',actor:string){
  const [locked]=await c.query<RowDataPacket[]>('SELECT a.*,p.status payment_status FROM payment_initiation_attempts a JOIN payment_transactions p ON p.id=a.payment_id WHERE a.payment_id=? FOR UPDATE',[paymentId]);
  const current=locked[0];
  if(!current||current.claim_owner!==owner||current.status!==expectedStatus||!current.lease_expires_at||new Date(current.lease_expires_at)<=new Date()){
    await audit(c,paymentId,'RECOVERY_STALE_CLAIM',actor,{subject:'payment_initiation',expectedStatus},null,owner);
    return null;
  }
  return current;
}
async function finishStaleInitialOutcome(c:PoolConnection,paymentId:number,owner:string,outcome:InitiationOutcome,reason:string,providerReference:string|null,actor:string){
  const [current]=await c.query<RowDataPacket[]>('SELECT p.status payment_status FROM payment_initiation_attempts a JOIN payment_transactions p ON p.id=a.payment_id WHERE a.payment_id=?',[paymentId]);
  await c.query("UPDATE payment_initiation_attempts SET status='COMPLETED',provider_outcome=?,last_error=?,next_attempt_at=NULL,updated_at=NOW() WHERE payment_id=? AND claim_owner=? AND status='PENDING_PROVIDER'",[outcome,reason,paymentId,owner]);
  await audit(c,paymentId,'INITIATION_STALE_STATE',actor,{outcome,paymentStatus:current[0]?.payment_status,providerReference},null,owner);
  return{status:'STALE_PAYMENT_STATE',paymentStatus:current[0]?.payment_status,providerReference};
}
async function persistAcceptedInitiation(paymentId:number, initiation:{providerReference:string;checkoutUrl?:string;expiresAt?:Date}, actor:string, owner:string) {
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    const current=await lockOwnedInitiation(c,paymentId,owner,'PENDING_PROVIDER',actor);
    if(!current){await c.commit();return{status:'STALE_CLAIM'};}
    if(!['PENDING','VERIFICATION_REQUIRED'].includes(current.payment_status)){const stale=await finishStaleInitialOutcome(c,paymentId,owner,'PROVIDER_ACCEPTED','Payment state changed before provider acceptance persisted',initiation.providerReference,actor);await c.commit();return stale;}
    await c.query("UPDATE payment_transactions SET status='PROCESSING',provider_reference=?,checkout_url=?,expires_at=?,updated_at=NOW() WHERE id=? AND status IN ('PENDING','VERIFICATION_REQUIRED')",[initiation.providerReference,initiation.checkoutUrl||null,initiation.expiresAt||null,paymentId]);
    await c.query("UPDATE payment_initiation_attempts SET status='PROVIDER_ACCEPTED',provider_reference=?,last_operation='PROVIDER_ACCEPTED',provider_outcome='PROVIDER_ACCEPTED',updated_at=NOW() WHERE payment_id=? AND claim_owner=? AND status='PENDING_PROVIDER'",[initiation.providerReference,paymentId,owner]);
    await audit(c,paymentId,'INITIATION_PROVIDER_ACCEPTED',actor,{providerReference:initiation.providerReference},null,owner);
    await audit(c,paymentId,'PAYMENT_PROCESSING',actor,{providerReference:initiation.providerReference},null,owner);
    await c.commit();return initiation;
  }catch(e){try{await c.rollback()}catch{}throw e}finally{c.release()}
}
async function rejectInitiation(paymentId:number, reason:string, actor:string, owner:string) {
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    const current=await lockOwnedInitiation(c,paymentId,owner,'PENDING_PROVIDER',actor);
    if(!current){await c.commit();return{status:'STALE_CLAIM'};}
    if(!['PENDING','VERIFICATION_REQUIRED'].includes(current.payment_status)){const stale=await finishStaleInitialOutcome(c,paymentId,owner,'DEFINITE_REJECTION',reason,current.provider_reference||null,actor);await c.commit();return stale;}
    await c.query("UPDATE payment_initiation_attempts SET status='DEFINITE_REJECTION',last_operation='DEFINITE_REJECTION',last_error=?,provider_outcome='DEFINITE_REJECTION',updated_at=NOW() WHERE payment_id=? AND claim_owner=? AND status='PENDING_PROVIDER'",[reason,paymentId,owner]);
    await terminalPayment(c,paymentId,'FAILED',actor,{reason},'RELEASED',['PENDING','VERIFICATION_REQUIRED']);
    await c.commit();return{status:'FAILED'};
  }catch(e){try{await c.rollback()}catch{}throw e}finally{c.release()}
}
async function markInitiationUnknown(paymentId:number, reason:string, actor:string, owner:string) {
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    const current=await lockOwnedInitiation(c,paymentId,owner,'PENDING_PROVIDER',actor);
    if(!current){await c.commit();return{status:'STALE_CLAIM'};}
    if(!['PENDING','PROCESSING','VERIFICATION_REQUIRED'].includes(current.payment_status)){const stale=await finishStaleInitialOutcome(c,paymentId,owner,'OUTCOME_UNKNOWN',reason,current.provider_reference||null,actor);await c.commit();return stale;}
    await c.query("UPDATE payment_initiation_attempts SET status='OUTCOME_UNKNOWN',last_operation='OUTCOME_UNKNOWN',last_error=?,provider_outcome='OUTCOME_UNKNOWN',updated_at=NOW() WHERE payment_id=? AND claim_owner=? AND status='PENDING_PROVIDER'",[reason,paymentId,owner]);
    await c.query("UPDATE payment_transactions SET status='VERIFICATION_REQUIRED',updated_at=NOW() WHERE id=? AND status IN ('PENDING','PROCESSING','VERIFICATION_REQUIRED')",[paymentId]);
    await audit(c,paymentId,'INITIATION_OUTCOME_UNKNOWN',actor,{reason},null,owner);
    await c.commit();return{status:'OUTCOME_UNKNOWN'};
  }catch(e){try{await c.rollback()}catch{}throw e}finally{c.release()}
}
async function executeInitiation(paymentId:number, ref:string, amount:number, memberId:number, providerCode:string) {
  const owner=randomUUID();
  const claimConnection=await pool.getConnection();
  try{
    await claimConnection.beginTransaction();
    const [claim]=await claimConnection.query<ResultSetHeader>(`UPDATE payment_initiation_attempts SET status='PENDING_PROVIDER',claim_owner=?,claimed_at=NOW(),lease_expires_at=DATE_ADD(NOW(),INTERVAL ? SECOND),next_attempt_at=NULL,retry_count=retry_count+1,last_operation='INITIATE',updated_at=NOW() WHERE payment_id=? AND status='REQUESTED'`,[owner,LEASE_SECONDS,paymentId]);
    if(claim.affectedRows!==1)throw new Error('Payment initiation is already being processed or requires reconciliation');
    await audit(claimConnection,paymentId,'LEASE_CLAIMED','gateway',{subject:'payment_initiation'},null,owner);
    await claimConnection.commit();
  }catch(e){try{await claimConnection.rollback()}catch{}throw e}finally{claimConnection.release()}
  try{
    const initiation=await getGateway(providerCode).initiatePayment({paymentReference:ref,amount,currency:'TZS',memberId});
    return await persistAcceptedInitiation(paymentId,initiation,'gateway',owner);
  }catch(error){
    const outcome=isDefiniteRejection(error)
      ? await rejectInitiation(paymentId,(error as Error).message,'gateway',owner)
      : await markInitiationUnknown(paymentId,(error as Error).message,'gateway',owner);
    if(['STALE_CLAIM','STALE_PAYMENT_STATE'].includes(String(outcome.status)))return outcome;
    throw error;
  }
}
async function reconcilePaymentInitiationAuthorized(paymentId:number,worker:{id:number;key:string},options:{maxAttempts?:number}={}) {
  const actor='recovery_worker';
  const maxAttempts=options.maxAttempts||MAX_RECOVERY_ATTEMPTS;
  const [rows]=await pool.query<RowDataPacket[]>('SELECT p.*,a.provider_reference attempt_provider_reference,a.status attempt_status FROM payment_transactions p JOIN payment_initiation_attempts a ON a.payment_id=p.id WHERE p.id=?',[paymentId]);
  const payment=rows[0];if(!payment)throw new Error('Payment initiation attempt not found');
  const gateway=getGateway(payment.provider_code);
  const owner=randomUUID();
  const claimConnection=await pool.getConnection();
  try{
    await claimConnection.beginTransaction();
    const [claim]=await claimConnection.query<ResultSetHeader>(`UPDATE payment_initiation_attempts SET status='RECONCILING',claim_owner=?,claimed_at=NOW(),lease_expires_at=DATE_ADD(NOW(),INTERVAL ? SECOND),next_attempt_at=NULL,retry_count=retry_count+1,last_operation='RECONCILE',updated_at=NOW() WHERE payment_id=? AND retry_count<? AND (next_attempt_at IS NULL OR next_attempt_at<=NOW()) AND ((status IN ('REQUESTED','OUTCOME_UNKNOWN','RECONCILIATION_REQUIRED')) OR (status IN ('PENDING_PROVIDER','RECONCILING') AND lease_expires_at<=NOW()))`,[owner,LEASE_SECONDS,paymentId,maxAttempts]);
    if(claim.affectedRows!==1)throw new Error('Initiation attempt cannot be claimed or is not due');
    await audit(claimConnection,paymentId,payment.attempt_status==='REQUESTED'?'LEASE_CLAIMED':'LEASE_RENEWED',actor,{subject:'payment_initiation',attemptStatus:payment.attempt_status},worker.id,owner);
    await claimConnection.commit();
  }catch(e){try{await claimConnection.rollback()}catch{}throw e}finally{claimConnection.release()}
  const lookup=payment.attempt_provider_reference||payment.provider_reference||payment.reference;
  const eligibleStates=['PENDING','PROCESSING','VERIFICATION_REQUIRED'];
  const lockCurrent=async(c:PoolConnection)=>{
    const [locked]=await c.query<RowDataPacket[]>('SELECT a.*,p.status payment_status FROM payment_initiation_attempts a JOIN payment_transactions p ON p.id=a.payment_id WHERE a.payment_id=? FOR UPDATE',[paymentId]);
    const current=locked[0];
    if(!current||current.claim_owner!==owner||current.status!=='RECONCILING'||!current.lease_expires_at||new Date(current.lease_expires_at)<=new Date()){
      await audit(c,paymentId,'RECOVERY_STALE_CLAIM',actor,{subject:'payment_initiation',outcome:'stale-worker'},worker.id,owner);
      return null;
    }
    return current;
  };
  const finishStale=async(c:PoolConnection,current:RowDataPacket,providerOutcome:{outcome:InitiationOutcome;initiation?:{providerReference:string}})=>{
    const conflict=!eligibleStates.includes(current.payment_status);
    await c.query("UPDATE payment_initiation_attempts SET status='COMPLETED',provider_outcome=?,last_error=?,next_attempt_at=NULL,updated_at=NOW() WHERE payment_id=? AND claim_owner=? AND status='RECONCILING'",[providerOutcome.outcome,'Payment state changed before recovery outcome',paymentId,owner]);
    await audit(c,paymentId,'INITIATION_RECOVERY_STALE_STATE',actor,{outcome:providerOutcome.outcome,paymentStatus:current.payment_status},worker.id,owner);
    if(conflict&&providerOutcome.outcome!=='OUTCOME_UNKNOWN')await openReconciliation(c,paymentId,'STALE_INITIATION_OUTCOME',{outcome:providerOutcome.outcome,paymentStatus:current.payment_status},payment.provider_reference||payment.reference,payment.provider_transaction_id||null);
    return{status:'STALE_PAYMENT_STATE',paymentStatus:current.payment_status,initiation:providerOutcome.initiation||null};
  };
  if(!gateway.checkInitiation){
    const c=await pool.getConnection();
    try{
      await c.beginTransaction();const current=await lockCurrent(c);if(!current){await c.commit();return{status:'STALE_CLAIM'};}
      if(!eligibleStates.includes(current.payment_status)){const stale=await finishStale(c,current,{outcome:'OUTCOME_UNKNOWN'});await c.commit();return stale;}
      await c.query("UPDATE payment_initiation_attempts SET status='RECONCILIATION_REQUIRED',provider_outcome='OUTCOME_UNKNOWN',last_error='Provider initiation lookup unavailable',next_attempt_at=DATE_ADD(NOW(),INTERVAL ? SECOND),updated_at=NOW() WHERE payment_id=? AND claim_owner=? AND status='RECONCILING'",[LEASE_SECONDS,paymentId,owner]);
      await markPaymentReconciliation(c,payment,'INITIATION_LOOKUP_UNAVAILABLE',{lookup},actor);
      await c.commit();return{status:'RECONCILIATION_REQUIRED'};
    }catch(e){try{await c.rollback()}catch{}throw e}finally{c.release()}
  }
  let outcome;
  try{
    outcome=await gateway.checkInitiation(lookup);
  }catch(error){
    const c=await pool.getConnection();
    try{
      await c.beginTransaction();const current=await lockCurrent(c);if(current){
        await c.query("UPDATE payment_initiation_attempts SET last_error=?,next_attempt_at=DATE_ADD(NOW(),INTERVAL ? SECOND),updated_at=NOW() WHERE payment_id=? AND claim_owner=? AND status='RECONCILING'",[(error as Error).message.slice(0,500),LEASE_SECONDS,paymentId,owner]);
        await audit(c,paymentId,'INITIATION_RECOVERY_FAILED',actor,{error:(error as Error).message},worker.id,owner);
        await audit(c,paymentId,'RETRY_SCHEDULED',actor,{subject:'payment_initiation',delaySeconds:LEASE_SECONDS},worker.id,owner);
      }
      await c.commit();
    }catch(inner){try{await c.rollback()}catch{}throw inner}finally{c.release()}
    throw error;
  }
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();const current=await lockCurrent(c);if(!current){await c.commit();return{status:'STALE_CLAIM'};}
    if(!eligibleStates.includes(current.payment_status)){const stale=await finishStale(c,current,outcome);await c.commit();return stale;}
    if(outcome.outcome==='PROVIDER_ACCEPTED'){
      const initiation=outcome.initiation;
      if(!initiation?.providerReference)throw new Error('Accepted initiation lacks provider reference');
      await c.query("UPDATE payment_transactions SET status='PROCESSING',provider_reference=?,checkout_url=COALESCE(?,checkout_url),expires_at=COALESCE(?,expires_at),updated_at=NOW() WHERE id=? AND status IN ('PENDING','VERIFICATION_REQUIRED','PROCESSING')",[initiation.providerReference,initiation.checkoutUrl||null,initiation.expiresAt||null,paymentId]);
      await c.query("UPDATE payment_initiation_attempts SET status='PROVIDER_ACCEPTED',provider_reference=?,provider_outcome='PROVIDER_ACCEPTED',next_attempt_at=NULL,updated_at=NOW() WHERE payment_id=? AND claim_owner=? AND status='RECONCILING'",[initiation.providerReference,paymentId,owner]);
      await audit(c,paymentId,'INITIATION_PROVIDER_ACCEPTED',actor,{providerReference:initiation.providerReference,recovered:true},worker.id,owner);
    }else if(outcome.outcome==='DEFINITE_REJECTION'){
      await c.query("UPDATE payment_initiation_attempts SET status='DEFINITE_REJECTION',provider_outcome='DEFINITE_REJECTION',last_error=?,updated_at=NOW() WHERE payment_id=? AND claim_owner=? AND status='RECONCILING'",[outcome.reason||'Provider rejected initiation',paymentId,owner]);
      await terminalPayment(c,paymentId,'FAILED',actor,{reason:outcome.reason||'Provider rejected initiation'},'RELEASED',eligibleStates as PaymentState[]);
    }else{
      await c.query("UPDATE payment_initiation_attempts SET status='OUTCOME_UNKNOWN',provider_outcome='OUTCOME_UNKNOWN',last_error=?,next_attempt_at=DATE_ADD(NOW(),INTERVAL ? SECOND),updated_at=NOW() WHERE payment_id=? AND claim_owner=? AND status='RECONCILING'",[outcome.reason||'Initiation outcome unknown',LEASE_SECONDS,paymentId,owner]);
      await c.query("UPDATE payment_transactions SET status='VERIFICATION_REQUIRED',updated_at=NOW() WHERE id=? AND status IN ('PENDING','PROCESSING','VERIFICATION_REQUIRED')",[paymentId]);
      await audit(c,paymentId,'INITIATION_OUTCOME_UNKNOWN',actor,{reason:outcome.reason||'Initiation outcome unknown'},worker.id,owner);
      await audit(c,paymentId,'RETRY_SCHEDULED',actor,{subject:'payment_initiation',delaySeconds:LEASE_SECONDS},worker.id,owner);
    }
    await c.commit();
    return{status:outcome.outcome,initiation:outcome.initiation||null};
  }catch(e){try{await c.rollback()}catch{}throw e}finally{c.release()}
}
export async function reconcilePaymentInitiation(paymentId:number,workerAuth:{workerKey:string;workerSecret:string},options:{maxAttempts?:number}={}){
  const worker=await requireRecoveryWorker(workerAuth.workerKey,workerAuth.workerSecret);
  return reconcilePaymentInitiationAuthorized(paymentId,worker,options);
}

export async function createPaymentIntentOnce(args:{actingUserId:number;memberId?:number;providerCode:string;cycleYears:number[];idempotencyKey:string}) {
  const memberId = args.memberId ?? args.actingUserId;
  getGateway(args.providerCode);
  const uniqueYears = [...new Set(args.cycleYears.map(Number))].sort((a,b)=>a-b);
  if (!args.actingUserId || !args.idempotencyKey || !uniqueYears.length || uniqueYears.length>3 || !Number.isInteger(memberId)) throw new Error('Invalid payment request');
  if (memberId !== args.actingUserId) throw new Error('Member impersonation rejected');
  const quotes = (await listFutureUnpaidCycles({userId:memberId,maxFuture:3})) as CycleQuote[];
  const selected = uniqueYears.map(year=>{const q=quotes.find(q=>Number(q.cycleYear)===year);if(!q||q.isPaid)throw new Error(`Cycle ${year} is not eligible for payment`);return q;});
  const amount=selected.reduce((s,q)=>s+Number(q.totalDue),0); if(amount<=0)throw new Error('Invalid calculated payment amount');
  const connection=await pool.getConnection();
  let paymentId=0;
  try{
    await connection.beginTransaction();
    const [users]=await connection.query<RowDataPacket[]>('SELECT id,is_approved FROM users WHERE id=? FOR UPDATE',[memberId]);
    if(!users[0]||Number(users[0].is_approved)!==1)throw new Error('Member is not approved for payment');
    const [existing]=await connection.query<RowDataPacket[]>('SELECT id,reference,status FROM payment_transactions WHERE idempotency_key=? AND user_id=? FOR UPDATE',[args.idempotencyKey,memberId]);
    if(existing[0]){const [a]=await connection.query<RowDataPacket[]>('SELECT * FROM payment_cycle_allocations WHERE payment_id=?',[existing[0].id]);await connection.commit();return{reused:true,payment:existing[0],allocations:a};}
    for(const quote of selected){
      const [res]=await connection.query<RowDataPacket[]>('SELECT r.*,p.status payment_status,a.status initiation_status FROM payment_cycle_reservations r LEFT JOIN payment_transactions p ON p.id=r.payment_id LEFT JOIN payment_initiation_attempts a ON a.payment_id=p.id WHERE r.user_id=? AND r.cycle_year=? FOR UPDATE',[memberId,quote.cycleYear]);
      const r=res[0];const expired=r?.expires_at&&new Date(r.expires_at)<=new Date();
      if(r&&r.status==='SETTLED')throw new Error(`Cycle ${quote.cycleYear} is already settled`);
      if(r&&r.status==='ACTIVE'&&!expired)throw new Error(`Cycle ${quote.cycleYear} already has an active payment reservation`);
      if(r&&r.status==='ACTIVE'&&expired){
        if(!['FAILED','CANCELLED','EXPIRED'].includes(String(r.payment_status)))throw new Error(`Expired reservation for cycle ${quote.cycleYear} requires payment reconciliation`);
        await connection.query("UPDATE payment_cycle_reservations SET status='EXPIRED',updated_at=NOW() WHERE id=?",[r.id]);
      }
      if(r&&['RELEASED','CANCELLED','EXPIRED'].includes(String(r.status)))await connection.query('UPDATE payment_cycle_reservations SET status=\'ACTIVE\',payment_id=NULL,expires_at=DATE_ADD(NOW(),INTERVAL ? MINUTE),updated_at=NOW() WHERE id=?',[RESERVATION_MINUTES,r.id]);
      else if(r)await connection.query('UPDATE payment_cycle_reservations SET status=\'ACTIVE\',payment_id=NULL,expires_at=DATE_ADD(NOW(),INTERVAL ? MINUTE),updated_at=NOW() WHERE id=?',[RESERVATION_MINUTES,r.id]);
      else await connection.query('INSERT INTO payment_cycle_reservations(user_id,cycle_year,status,expires_at,created_at,updated_at) VALUES(?,?,\'ACTIVE\',DATE_ADD(NOW(),INTERVAL ? MINUTE),NOW(),NOW())',[memberId,quote.cycleYear,RESERVATION_MINUTES]);
      const [funded]=await connection.query<RowDataPacket[]>(`SELECT e.id FROM membership_cycle_entitlements e WHERE e.user_id=? AND e.cycle_year=? AND e.entitlement_status='active' LIMIT 1 FOR UPDATE`,[memberId,quote.cycleYear]);
      if(funded[0])throw new Error(`Cycle ${quote.cycleYear} is already funded`);
      const [paidRows]=await connection.query<RowDataPacket[]>('SELECT id FROM cycle_payment_status WHERE user_id=? AND cycle_year=? AND is_paid=TRUE LIMIT 1 FOR UPDATE',[memberId,quote.cycleYear]);
      if(paidRows[0])throw new Error(`Cycle ${quote.cycleYear} is already paid`);
    }
    const ref=reference();const [ins]=await connection.query<ResultSetHeader>(`INSERT INTO payment_transactions(reference,idempotency_key,user_id,provider_code,kind,status,amount,currency,created_at,updated_at) VALUES(?,?,?,?,?,'PENDING',?,'TZS',NOW(),NOW())`,[ref,args.idempotencyKey,memberId,args.providerCode,uniqueYears.length>1?'COMBINED':'SEPARATE',amount]);
    paymentId=ins.insertId;
    for(const q of selected){
      await connection.query('INSERT INTO payment_cycle_allocations(payment_id,cycle_year,base_amount,penalty_amount,amount,status,created_at,updated_at) VALUES(?,?,?,?,?,\'ALLOCATED\',NOW(),NOW())',[paymentId,q.cycleYear,q.baseAmount,q.penaltyAmount,q.totalDue]);
      await connection.query('UPDATE payment_cycle_reservations SET payment_id=?,updated_at=NOW() WHERE user_id=? AND cycle_year=? AND status=\'ACTIVE\'',[paymentId,memberId,q.cycleYear]);
    }
    await connection.query("INSERT INTO payment_initiation_attempts(payment_id,attempt_key,status,created_at,updated_at) VALUES(?,?, 'REQUESTED',NOW(),NOW())",[paymentId,`init-${paymentId}`]);
    await audit(connection,paymentId,'PAYMENT_PENDING','member',{reference:ref,cycles:uniqueYears},args.actingUserId);
    await audit(connection,paymentId,'INITIATION_REQUESTED','member',{attemptKey:`init-${paymentId}`},args.actingUserId);
    await connection.commit();
    const initiation=await executeInitiation(paymentId,ref,amount,memberId,args.providerCode);
    return{reused:false,payment:{id:paymentId,reference:ref,status:'PROCESSING'},initiation,allocations:selected};
  }catch(e){try{await connection.rollback()}catch{}throw e}finally{connection.release()}
}
export async function createPaymentIntent(args:Parameters<typeof createPaymentIntentOnce>[0]){for(let i=0;i<3;i++){try{return await createPaymentIntentOnce(args)}catch(e){if(sqlErrorCode(e)!=='ER_LOCK_DEADLOCK'||i===2)throw e;await new Promise(r=>setTimeout(r,25*(i+1)))}}throw new Error('Payment initiation failed')}

export async function transitionPayment(paymentId:number,next:PaymentState,actor:string,details:unknown={}){const c=await pool.getConnection();try{await c.beginTransaction();const [r]=await c.query<RowDataPacket[]>('SELECT status FROM payment_transactions WHERE id=? FOR UPDATE',[paymentId]);const cur=r[0]?.status as PaymentState|undefined;if(!cur||!transitions[cur].includes(next))throw new Error(`Invalid payment transition ${cur||'missing'} to ${next}`);await c.query('UPDATE payment_transactions SET status=?,updated_at=NOW() WHERE id=?',[next,paymentId]);await audit(c,paymentId,`PAYMENT_${next}`,actor,details);await c.commit()}catch(e){await c.rollback();throw e}finally{c.release()}}
export async function processGatewayNotification(args:{providerCode:string;headers:Record<string,string>;rawBody:string}){const gateway=getGateway(args.providerCode);if(!gateway.verifyNotification)throw new Error('Provider does not support notifications');const notice=await gateway.verifyNotification(args);if(!notice.providerEventId)throw new Error('Provider event ID is required');const [rows]=await pool.query<RowDataPacket[]>('SELECT * FROM payment_transactions WHERE (provider_reference=? OR reference=?) AND provider_code=?',[notice.providerReference,notice.providerReference,args.providerCode]);const payment=rows[0];if(!payment)throw new Error('Unknown payment reference');if(['SUCCESS','REFUNDED'].includes(payment.status))return{duplicate:true,paymentId:payment.id,status:payment.status};const result=await settlePayment(payment.id,'gateway');try{await pool.query('INSERT INTO payment_notifications(payment_id,provider_code,provider_event_id,payload_hash,processed_at) VALUES(?,?,?,?,NOW())',[payment.id,args.providerCode,notice.providerEventId,auditHash(args.rawBody)])}catch(e){if(sqlErrorCode(e)==='ER_DUP_ENTRY')return{duplicate:true,paymentId:payment.id,status:result.status||payment.status};throw e}return result}

async function verifyPayment(paymentId:number){
  const [rows]=await pool.query<RowDataPacket[]>('SELECT * FROM payment_transactions WHERE id=?',[paymentId]);const payment=rows[0];
  if(!payment)throw new Error('Payment not found');
  if(payment.status==='SUCCESS')return{payment,verification:null,verificationError:null,duplicate:true};
  if(!['PROCESSING','VERIFICATION_REQUIRED','EXPIRED','RECONCILIATION_REQUIRED'].includes(payment.status))throw new Error('Payment cannot be settled');
  const gateway=getGateway(payment.provider_code);
  try{return{payment,verification:await gateway.checkTransactionStatus(payment.provider_reference||payment.reference),verificationError:null,duplicate:false}}
  catch(error){return{payment,verification:null,verificationError:error as Error,duplicate:false}}
}
async function settlePaymentOnce(paymentId:number,actor:string){
  const stage=await verifyPayment(paymentId);
  if(stage.duplicate)return{settled:true,duplicate:true};
  const before=stage.payment;const verification=stage.verification;
  const connection=await pool.getConnection();
  try{
    await connection.beginTransaction();
    const [rows]=await connection.query<RowDataPacket[]>('SELECT * FROM payment_transactions WHERE id=? FOR UPDATE',[paymentId]);const payment=rows[0];
    if(payment.status==='SUCCESS'){await connection.commit();return{settled:true,duplicate:true};}
    if(!['PROCESSING','VERIFICATION_REQUIRED','EXPIRED','RECONCILIATION_REQUIRED'].includes(payment.status))throw new Error('Payment state changed before settlement');
    if(payment.reference!==before.reference||payment.provider_code!==before.provider_code||String(payment.provider_reference||'')!==String(before.provider_reference||'')||Number(payment.amount)!==Number(before.amount)||payment.currency!==before.currency)throw new Error('Stale payment verification rejected');
    if(stage.verificationError){
      if(payment.status==='EXPIRED'||payment.status==='RECONCILIATION_REQUIRED'||(payment.expires_at&&new Date(payment.expires_at)<=new Date())){await markPaymentReconciliation(connection,payment,'PROVIDER_STATUS_UNKNOWN',{error:stage.verificationError.message},actor);await connection.commit();return{settled:false,status:'RECONCILIATION_REQUIRED'};}
      await connection.query("UPDATE payment_transactions SET status='VERIFICATION_REQUIRED',updated_at=NOW() WHERE id=?",[payment.id]);
      await audit(connection,payment.id,'PROVIDER_STATUS_UNKNOWN',actor,{error:stage.verificationError.message});
      await connection.commit();return{settled:false,status:'VERIFICATION_REQUIRED'};
    }
    if(!verification)throw new Error('Missing provider verification');
    if(verification.providerReference!==(payment.provider_reference||payment.reference)){await markPaymentReconciliation(connection,payment,'PROVIDER_REFERENCE_MISMATCH',{providerReference:'mismatch'},actor);await connection.commit();throw new Error('Verified payment provider reference mismatch');}
    if(Number(verification.amount)!==Number(payment.amount)||verification.currency!==payment.currency){await audit(connection,payment.id,'VERIFICATION_REJECTED',actor,{expectedAmount:payment.amount,currency:payment.currency});await connection.commit();throw new Error('Verified payment amount or currency mismatch');}
    const memberReference=typeof verification.memberReference==='string'?verification.memberReference.trim():'';
    if(!memberReference||memberReference.length>150||!/^[\w:.-]+$/.test(memberReference)){await markPaymentReconciliation(connection,payment,'MEMBER_REFERENCE_MISSING',{memberReference:verification.memberReference??null},actor);await connection.commit();throw new Error('Verified payment member identity is missing or malformed');}
    if(memberReference!==payment.reference){await markPaymentReconciliation(connection,payment,'MEMBER_REFERENCE_MISMATCH',{memberReference:'mismatch'},actor);await connection.commit();throw new Error('Verified payment member reference mismatch');}
    if(verification.state==='PENDING'){
      if(payment.status==='EXPIRED'||payment.status==='RECONCILIATION_REQUIRED'||(payment.expires_at&&new Date(payment.expires_at)<=new Date())){await markPaymentReconciliation(connection,payment,'EXPIRED_PAYMENT_PENDING_PROVIDER',{providerReference:verification.providerReference},actor);}
      else await connection.query("UPDATE payment_transactions SET status='VERIFICATION_REQUIRED',updated_at=NOW() WHERE id=?",[payment.id]);
      await connection.commit();return{settled:false,status:payment.status==='EXPIRED'?'RECONCILIATION_REQUIRED':'VERIFICATION_REQUIRED'};
    }
    if(FINAL_STATES.includes(verification.state)){await terminalPayment(connection,payment.id,verification.state,actor,{providerReference:verification.providerReference},verification.state==='EXPIRED'?'EXPIRED':verification.state==='CANCELLED'?'CANCELLED':'RELEASED');await connection.commit();return{settled:false,status:verification.state};}
    if(verification.state!=='SUCCESS')throw new Error('Unsupported verification state');
    if(!verification.providerTransactionId){await markPaymentReconciliation(connection,payment,'MISSING_PROVIDER_TRANSACTION_ID',{providerTransactionId:'missing'},actor);await connection.commit();throw new Error('Missing provider transaction identity');}
    const [duplicateTxn]=await connection.query<RowDataPacket[]>('SELECT id FROM payment_transactions WHERE provider_code=? AND provider_transaction_id=? AND id<>? LIMIT 1 FOR UPDATE',[payment.provider_code,verification.providerTransactionId,payment.id]);
    if(duplicateTxn[0]){await markPaymentReconciliation(connection,payment,'DUPLICATE_PROVIDER_TRANSACTION',{providerTransactionId:verification.providerTransactionId},actor,verification.providerTransactionId,false);await connection.commit();throw new Error('Duplicate provider transaction identity');}
    const [allocs]=await connection.query<RowDataPacket[]>('SELECT * FROM payment_cycle_allocations WHERE payment_id=? ORDER BY cycle_year FOR UPDATE',[payment.id]);
    const reservations:RowDataPacket[]=[];
    for(const a of allocs){
      const [res]=await connection.query<RowDataPacket[]>('SELECT * FROM payment_cycle_reservations WHERE user_id=? AND cycle_year=? FOR UPDATE',[payment.user_id,a.cycle_year]);
      const reservation=res[0];
      if(!reservation||reservation.payment_id!==payment.id||reservation.status!=='ACTIVE'||new Date(reservation.expires_at)<=new Date()){
        if(reservation?.status==='ACTIVE'&&new Date(reservation.expires_at)<=new Date())await connection.query("UPDATE payment_cycle_reservations SET status='EXPIRED',updated_at=NOW() WHERE id=?",[reservation.id]);
        await markPaymentReconciliation(connection,payment,'LATE_PROVIDER_SUCCESS',{cycleYear:a.cycle_year,reservation:reservation||'missing'},actor,verification.providerTransactionId);
        await connection.commit();return{settled:false,status:'RECONCILIATION_REQUIRED'};
      }
      const [funded]=await connection.query<RowDataPacket[]>(`SELECT e.id FROM membership_cycle_entitlements e JOIN payment_cycle_allocations other ON other.id=e.payment_allocation_id WHERE e.user_id=? AND e.cycle_year=? AND e.entitlement_status='active' AND other.payment_id<>? FOR UPDATE`,[payment.user_id,a.cycle_year,payment.id]);
      if(funded[0]){await markPaymentReconciliation(connection,payment,'LATE_PROVIDER_SUCCESS_ALREADY_FUNDED',{cycleYear:a.cycle_year},actor,verification.providerTransactionId);await connection.commit();return{settled:false,status:'RECONCILIATION_REQUIRED'};}
      reservations.push(reservation);
    }
    for(let i=0;i<allocs.length;i++){
      const a=allocs[i];
      await connection.query("UPDATE payment_cycle_allocations SET status='PAID',paid_at=NOW(),updated_at=NOW() WHERE id=? AND status='ALLOCATED'",[a.id]);
      const [existingEntitlement]=await connection.query<RowDataPacket[]>('SELECT id,entitlement_status FROM membership_cycle_entitlements WHERE user_id=? AND cycle_year=? FOR UPDATE',[payment.user_id,a.cycle_year]);
      if(existingEntitlement[0]){
        if(existingEntitlement[0].entitlement_status!=='reversed')throw new Error('Active entitlement already exists for funded cycle');
        await connection.query("UPDATE membership_cycle_entitlements SET payment_allocation_id=?,entitlement_status='active',granted_at=NOW(),revoked_at=NULL,updated_at=NOW() WHERE id=?",[a.id,existingEntitlement[0].id]);
      }else await connection.query("INSERT INTO membership_cycle_entitlements(payment_allocation_id,user_id,cycle_year,entitlement_status,granted_at,updated_at) VALUES(?,?,?,'active',NOW(),NOW())",[a.id,payment.user_id,a.cycle_year]);
      const [cps]=await connection.query<RowDataPacket[]>('SELECT id FROM cycle_payment_status WHERE user_id=? AND cycle_year=? FOR UPDATE',[payment.user_id,a.cycle_year]);
      if(cps[0])await connection.query("UPDATE cycle_payment_status SET is_paid=TRUE,payment_date=NOW(),amount_paid=?,penalty_amount=?,total_amount=?,payment_reference=?,status='paid',updated_at=NOW() WHERE id=?",[a.base_amount,a.penalty_amount,a.amount,payment.reference,cps[0].id]);
      else await connection.query("INSERT INTO cycle_payment_status(user_id,cycle_year,is_paid,payment_date,amount_paid,penalty_amount,total_amount,payment_reference,status,updated_at) VALUES(?,?,TRUE,NOW(),?,?,?,?,'paid',NOW())",[payment.user_id,a.cycle_year,a.base_amount,a.penalty_amount,a.amount,payment.reference]);
      await connection.query("UPDATE payment_cycle_reservations SET status='SETTLED',updated_at=NOW() WHERE id=?",[reservations[i].id]);
    }
    await refreshMembershipProjection(connection,payment.user_id);
    await connection.query('UPDATE payment_transactions SET status=?,provider_transaction_id=?,succeeded_at=NOW(),updated_at=NOW() WHERE id=?',['SUCCESS',verification.providerTransactionId,payment.id]);
    await audit(connection,payment.id,'PAYMENT_SUCCESS',actor,{providerTransactionId:verification.providerTransactionId});
    await connection.commit();return{settled:true,status:'SUCCESS'};
  }catch(e){try{await connection.rollback()}catch{}throw e}finally{connection.release()}
}
export async function settlePayment(paymentId:number,actor:string){for(let i=0;i<3;i++){try{return await settlePaymentOnce(paymentId,actor)}catch(e){if(sqlErrorCode(e)!=='ER_LOCK_DEADLOCK'||i===2)throw e;await new Promise(r=>setTimeout(r,25*(i+1)))}}throw new Error('Payment settlement failed')}

export async function refundPaymentAllocations(args:{paymentId:number;allocationIds:number[];amount:number;reason:string;actorId:number;actorType:'admin'|'manual_approver'|'system';evidence?:string;manualApprovalId?:string;requestKey?:string;workerId?:string;workerAuth?:{workerKey:string;workerSecret:string}}){
  if(!args.allocationIds.length||args.amount<=0)throw new Error('Invalid refund request');
  const requestKey=args.requestKey||`refund-${args.paymentId}-${[...args.allocationIds].sort((a,b)=>a-b).join('-')}`;
  const workerId=args.workerId||randomUUID();
  let requestId=0,payment:RowDataPacket|undefined,providerRefundReference:string|null=null,priorStatus='',requestEvidenceHash:string|null=null;
  let operationAllocationIds=args.allocationIds,operationAmount=args.amount,operationReason=args.reason,operationRequestedBy=args.actorId,manualApprovalId=args.manualApprovalId;
  let manual=args.actorType==='manual_approver',operationActorType:string=args.actorType,operationActorId:number=args.actorId;
  const connection=await pool.getConnection();
  try{
    await connection.beginTransaction();
    const [payments]=await connection.query<RowDataPacket[]>('SELECT * FROM payment_transactions WHERE id=? FOR UPDATE',[args.paymentId]);
    payment=payments[0];if(!payment||payment.status!=='SUCCESS')throw new Error('Only successful payments can be refunded');
    const [existingRequests]=await connection.query<RowDataPacket[]>('SELECT * FROM payment_refund_requests WHERE payment_id=? AND request_key=? FOR UPDATE',[args.paymentId,requestKey]);
    const existingRequest=existingRequests[0];
    if(existingRequest){
      if(!args.workerAuth){
        if(existingRequest.status==='REQUESTED')throw new Error('Refund request is already being processed');
        throw new Error('Unauthorized recovery worker');
      }
      const worker=await requireRecoveryWorker(args.workerAuth.workerKey,args.workerAuth.workerSecret);
      requestId=existingRequest.id;priorStatus=existingRequest.status;providerRefundReference=existingRequest.provider_refund_reference||null;requestEvidenceHash=existingRequest.evidence_hash||null;
      operationAllocationIds=parseAllocationIds(existingRequest.allocation_ids);operationAmount=Number(existingRequest.amount);operationReason=String(existingRequest.reason);operationRequestedBy=Number(existingRequest.requested_by);manual=Boolean(existingRequest.is_manual);manualApprovalId=existingRequest.manual_approval_id||null;
      operationActorType='recovery_worker';operationActorId=worker.id;
      if(existingRequest.status==='RECONCILIATION_REQUIRED'&&!providerRefundReference)throw new Error('Refund outcome is uncertain and requires reconciliation before retry');
      if(Number(existingRequest.retry_count)>=MAX_RECOVERY_ATTEMPTS)throw new Error('Refund retry limit reached');
      if(existingRequest.next_attempt_at&&new Date(existingRequest.next_attempt_at)>new Date())throw new Error('Refund retry is not due');
    }else{
      if(!args.reason||!args.actorId)throw new Error('Invalid refund request');
      if(manual&&!manualApprovalId)throw new Error('Manual refund requires approval reference');
      if(manual&&!args.evidence)throw new Error('Manual refund requires supporting evidence');
      const [actors]=await connection.query<RowDataPacket[]>('SELECT id,is_admin FROM users WHERE id=? FOR UPDATE',[args.actorId]);
      if(!actors[0]||Number(actors[0].is_admin)!==1)throw new Error('Unauthorized refund actor');
    }
    const placeholders=operationAllocationIds.map(()=>'?').join(',');
    const expectedStatus=existingRequest?'REFUNDING':'PAID';
    const [allocations]=await connection.query<RowDataPacket[]>(`SELECT * FROM payment_cycle_allocations WHERE payment_id=? AND status=? AND id IN (${placeholders}) FOR UPDATE`,[args.paymentId,expectedStatus,...operationAllocationIds]);
    if(allocations.length!==operationAllocationIds.length)throw new Error('Invalid or already-refunded allocation');
    const refundable=allocations.reduce((s,a)=>s+Number(a.amount),0);if(Number(operationAmount)!==refundable)throw new Error('Refund amount must equal selected allocation amount');
    if(!existingRequest){
      const [req]=await connection.query<ResultSetHeader>(`INSERT INTO payment_refund_requests(request_key,payment_id,amount,reason,status,requested_by,is_manual,manual_approval_id,evidence_hash,allocation_ids,created_at,updated_at) VALUES(?,?,?,?, 'REQUESTED',?,?,?,?,?,NOW(),NOW())`,[requestKey,args.paymentId,operationAmount,operationReason,operationRequestedBy,manual?1:0,manualApprovalId||null,args.evidence?auditHash(args.evidence):null,JSON.stringify(operationAllocationIds)]);
      requestId=req.insertId;
      await connection.query(`UPDATE payment_cycle_allocations SET status='REFUNDING',updated_at=NOW() WHERE payment_id=? AND id IN (${placeholders})`,[args.paymentId,...operationAllocationIds]);
      await audit(connection,args.paymentId,'REFUND_REQUESTED',operationActorType,{requestId,allocations:operationAllocationIds},operationActorId);
    }
    await connection.commit();
  }catch(e){try{await connection.rollback()}catch{}throw e}finally{connection.release()}

  let alreadyConfirmed=false,verifyOnly=false;
  if(priorStatus==='PENDING_PROVIDER'&&!providerRefundReference){
    const [stale]=await pool.query<RowDataPacket[]>('SELECT lease_expires_at FROM payment_refund_requests WHERE id=?',[requestId]);
    if(stale[0]?.lease_expires_at&&new Date(stale[0].lease_expires_at)>new Date())throw new Error('Refund request is already being processed');
    const failure=await pool.getConnection();
    try{
      await failure.beginTransaction();
      await failure.query("UPDATE payment_refund_requests SET status='RECONCILIATION_REQUIRED',last_error='Provider operation crashed before reference persisted',updated_at=NOW() WHERE id=? AND status='PENDING_PROVIDER'",[requestId]);
      await markRefundReconciliation(failure,requestId,args.paymentId,'REFUND_PROVIDER_OUTCOME_UNKNOWN',{requestId},operationActorType);
      await failure.commit();
    }catch(e){try{await failure.rollback()}catch{}throw e}finally{failure.release()}
    throw new Error('Refund outcome is uncertain and requires reconciliation before retry');
  }
  const claimConnection=await pool.getConnection();
  try{
    await claimConnection.beginTransaction();
    const [claim]=await claimConnection.query<ResultSetHeader>(`UPDATE payment_refund_requests SET status=IF(status='PROVIDER_CONFIRMED','PROVIDER_CONFIRMED','PENDING_PROVIDER'),claim_owner=?,claimed_at=NOW(),lease_expires_at=DATE_ADD(NOW(),INTERVAL ? SECOND),retry_count=retry_count+1,last_operation=IF(status='PROVIDER_CONFIRMED','LOCAL_COMPLETE',?),updated_at=NOW() WHERE id=? AND retry_count<? AND (next_attempt_at IS NULL OR next_attempt_at<=NOW()) AND (status='REQUESTED' OR status='PROVIDER_CONFIRMED' OR (status='RECONCILIATION_REQUIRED' AND provider_refund_reference IS NOT NULL) OR (status='PENDING_PROVIDER' AND lease_expires_at<=NOW()))`,[workerId,LEASE_SECONDS,providerRefundReference?'VERIFY_EXISTING':'INITIATE',requestId,MAX_RECOVERY_ATTEMPTS]);
    if(claim.affectedRows!==1){
      const [state]=await claimConnection.query<RowDataPacket[]>('SELECT status,provider_refund_reference FROM payment_refund_requests WHERE id=?',[requestId]);
      if(state[0]?.status==='PROVIDER_CONFIRMED'){providerRefundReference=state[0].provider_refund_reference;alreadyConfirmed=true}
      else if(state[0]?.status==='PENDING_PROVIDER')throw new Error('Refund request is already being processed');
      else throw new Error('Refund request cannot be claimed');
    }else{
      if(priorStatus==='PROVIDER_CONFIRMED')alreadyConfirmed=true;
      else if(providerRefundReference)verifyOnly=true;
      await audit(claimConnection,args.paymentId,['','REQUESTED','PROVIDER_CONFIRMED'].includes(priorStatus)?'LEASE_CLAIMED':'LEASE_RENEWED',operationActorType,{subject:'payment_refund',requestId,verifyOnly},operationActorId,workerId);
    }
    await claimConnection.commit();
  }catch(e){try{await claimConnection.rollback()}catch{}throw e}finally{claimConnection.release()}

  try{
    if(!alreadyConfirmed){
      const gateway=getGateway(payment.provider_code);
      if(manual)providerRefundReference=`MANUAL-${manualApprovalId}`;
      else{
        if(!gateway.initiateRefund||!gateway.verifyRefund)throw new Error('Provider refunds are unavailable');
        if(!verifyOnly){
          const providerRefund=await gateway.initiateRefund({providerReference:payment.provider_reference||payment.reference,amount:operationAmount,reason:operationReason});
          providerRefundReference=providerRefund.providerRefundReference||null;
          await pool.query('UPDATE payment_refund_requests SET provider_refund_reference=?,last_operation=?,updated_at=NOW() WHERE id=? AND claim_owner=?',[providerRefundReference,providerRefundReference?'PROVIDER_INITIATED':'PROVIDER_UNKNOWN',requestId,workerId]);
        }
        const confirmed=await gateway.verifyRefund({providerReference:payment.provider_reference||payment.reference,providerRefundReference});
        if(!confirmed)throw new Error('Refund was not confirmed by provider');
      }
      await pool.query('UPDATE payment_refund_requests SET status=?,provider_refund_reference=?,confirmed_at=NOW(),last_operation=?,updated_at=NOW() WHERE id=? AND status=? AND claim_owner=?',['PROVIDER_CONFIRMED',providerRefundReference,manual?'MANUAL_CONFIRMED':'PROVIDER_CONFIRMED',requestId,'PENDING_PROVIDER',workerId]);
    }
  }catch(e){
    if((e as Error).message==='Refund request is already being processed')throw e;
    const failure=await pool.getConnection();
    try{
      await failure.beginTransaction();
      await failure.query('UPDATE payment_refund_requests SET status=?,last_error=?,failure_reason=?,next_attempt_at=DATE_ADD(NOW(),INTERVAL ? SECOND),updated_at=NOW() WHERE id=? AND claim_owner=?',['RECONCILIATION_REQUIRED',(e as Error).message.slice(0,500),(e as Error).message.slice(0,500),LEASE_SECONDS,requestId,workerId]);
      await markRefundReconciliation(failure,requestId,args.paymentId,'REFUND_PROVIDER_RECOVERY_REQUIRED',{requestId,error:(e as Error).message},operationActorType);
      await audit(failure,args.paymentId,'RETRY_SCHEDULED',operationActorType,{subject:'payment_refund',requestId,delaySeconds:LEASE_SECONDS},operationActorId,workerId);
      await failure.commit();
    }catch(inner){try{await failure.rollback()}catch{}throw inner}finally{failure.release()}
    throw e;
  }

  const completion=await pool.getConnection();
  try{
    await completion.beginTransaction();
    const [payments]=await completion.query<RowDataPacket[]>('SELECT * FROM payment_transactions WHERE id=? FOR UPDATE',[args.paymentId]);payment=payments[0];
    const [requests]=await completion.query<RowDataPacket[]>('SELECT * FROM payment_refund_requests WHERE id=? FOR UPDATE',[requestId]);const request=requests[0];
    if(!request||request.status!=='PROVIDER_CONFIRMED'||request.claim_owner!==workerId)throw new Error('Refund request is not confirmed by this recovery worker');
    const placeholders=operationAllocationIds.map(()=>'?').join(',');
    const [allocations]=await completion.query<RowDataPacket[]>(`SELECT * FROM payment_cycle_allocations WHERE payment_id=? AND status='REFUNDING' AND id IN (${placeholders}) FOR UPDATE`,[args.paymentId,...operationAllocationIds]);
    if(allocations.length!==operationAllocationIds.length)throw new Error('Refund allocation state changed');
    const [refund]=await completion.query<ResultSetHeader>(`INSERT INTO payment_refunds(payment_id,refund_reference,amount,reason,status,requested_by,provider_refund_reference,evidence_hash,confirmed_at,created_at,updated_at) VALUES(?,?,?,?,'CONFIRMED',?,?,?,NOW(),NOW(),NOW())`,[args.paymentId,`TLA-RFD-${randomUUID()}`,operationAmount,operationReason,operationRequestedBy,providerRefundReference,args.evidence?auditHash(args.evidence):requestEvidenceHash]);
    const refundId=refund.insertId;
    for(const allocation of allocations){
      await completion.query('INSERT INTO payment_refund_allocations(refund_id,payment_allocation_id,amount,created_at) VALUES(?,?,?,NOW())',[refundId,allocation.id,allocation.amount]);
      await completion.query("UPDATE payment_cycle_allocations SET status='REFUNDED',refunded_at=NOW(),updated_at=NOW() WHERE id=?",[allocation.id]);
      await completion.query("UPDATE membership_cycle_entitlements SET entitlement_status='reversed',revoked_at=NOW(),updated_at=NOW() WHERE payment_allocation_id=?",[allocation.id]);
      await completion.query("UPDATE cycle_payment_status SET is_paid=FALSE,status='unpaid',payment_reference=NULL,updated_at=NOW() WHERE user_id=? AND cycle_year=? AND payment_reference=?",[payment.user_id,allocation.cycle_year,payment.reference]);
      await completion.query("UPDATE payment_cycle_reservations SET status='RELEASED',payment_id=NULL,updated_at=NOW() WHERE user_id=? AND cycle_year=? AND payment_id=?",[payment.user_id,allocation.cycle_year,args.paymentId]);
    }
    const [remaining]=await completion.query<RowDataPacket[]>("SELECT COUNT(*) c FROM payment_cycle_allocations WHERE payment_id=? AND status='PAID'",[args.paymentId]);const remainingAllocations=Number(remaining[0].c);
    if(remainingAllocations===0)await completion.query("UPDATE payment_transactions SET status='REFUNDED',refunded_at=NOW(),updated_at=NOW() WHERE id=?",[args.paymentId]);
    await refreshMembershipProjection(completion,payment.user_id);
    await completion.query("UPDATE payment_refund_requests SET status='COMPLETED',completed_at=NOW(),last_operation='COMPLETED',updated_at=NOW() WHERE id=?",[requestId]);
    await audit(completion,args.paymentId,'REFUND_CONFIRMED',operationActorType,{requestId,refundId,allocations:operationAllocationIds,requestedBy:operationRequestedBy},operationActorId);
    await completion.commit();return{requestId,refundId,remainingAllocations};
  }catch(e){try{await completion.rollback()}catch{}throw e}finally{completion.release()}
}

async function requireFinanceAdmin(actorId:number,connection?:PoolConnection){
  const db=connection||pool;
  const [rows]=await db.query<RowDataPacket[]>("SELECT id FROM users WHERE id=? AND role='finance_admin' LIMIT 1",[actorId]);
  if(!rows[0])throw new Error('Unauthorized finance administrator');
}
function parseAllocationIds(value:unknown):number[]{
  if(Array.isArray(value))return value.map(Number);
  try{return JSON.parse(String(value)).map(Number)}catch{return[]}
}
function workerSecretHash(secret:string){return createHash('sha256').update(secret).digest('hex')}
async function requireRecoveryWorker(workerKey:string|undefined,workerSecret:string|undefined){
  if(!workerKey||!workerSecret)throw new Error('Unauthorized recovery worker');
  const [rows]=await pool.query<RowDataPacket[]>('SELECT id,worker_key,secret_hash,is_active FROM payment_recovery_workers WHERE worker_key=? LIMIT 1',[workerKey]);
  const worker=rows[0];if(!worker||!worker.is_active||worker.secret_hash!==workerSecretHash(workerSecret))throw new Error('Unauthorized recovery worker');
  await pool.query('UPDATE payment_recovery_workers SET last_used_at=NOW() WHERE id=?',[worker.id]);
  return{id:Number(worker.id),key:String(worker.worker_key)};
}
export async function sweepPaymentLeases(args:{workerKey:string;workerSecret:string;workerId?:string;limit?:number;maxAttempts?:number;paymentId?:number;refundRequestId?:number}){
  const worker=await requireRecoveryWorker(args.workerKey,args.workerSecret);
  const workerId=args.workerId||randomUUID();
  const limit=Math.min(Math.max(args.limit||20,1),100);
  const maxAttempts=args.maxAttempts||MAX_RECOVERY_ATTEMPTS;
  const correlationId=`sweep-${worker.key}-${workerId}`;
  const results={initiationAttempts:0,initiationRecovered:0,refundAttempts:0,refundsRecovered:0,claimConflicts:0,failed:0,auditFailed:0};
  const scopedToRefundOnly=!!args.refundRequestId&&!args.paymentId;
  const record=async(paymentId:number,event:string,data:unknown)=>{
    try{await directAudit(paymentId,event,'recovery_worker',data,worker.id,correlationId);return true}
    catch{results.auditFailed++;return false}
  };
  if(!scopedToRefundOnly){
    const [attempts]=await pool.query<RowDataPacket[]>(`SELECT a.payment_id,a.status,a.retry_count,p.reference FROM payment_initiation_attempts a JOIN payment_transactions p ON p.id=a.payment_id WHERE a.retry_count<? AND ((a.status='REQUESTED' AND a.updated_at<=DATE_SUB(NOW(),INTERVAL ? SECOND)) OR (a.status IN ('PENDING_PROVIDER','RECONCILING') AND a.lease_expires_at<=NOW()) OR (a.status IN ('OUTCOME_UNKNOWN','RECONCILIATION_REQUIRED') AND (a.next_attempt_at IS NULL OR a.next_attempt_at<=NOW()))) ${args.paymentId?'AND a.payment_id=?':''} ORDER BY a.updated_at LIMIT ?`,args.paymentId?[maxAttempts,LEASE_SECONDS,args.paymentId,limit]:[maxAttempts,LEASE_SECONDS,limit]);
    for(const attempt of attempts){
      results.initiationAttempts++;
      const discoveryEvent=['PENDING_PROVIDER','RECONCILING'].includes(attempt.status)?'LEASE_EXPIRED':attempt.status==='REQUESTED'?'RECOVERY_QUEUED':'RETRY_DUE';
      if(!await record(attempt.payment_id,discoveryEvent,{subject:'payment_initiation',status:attempt.status})||!await record(attempt.payment_id,'RECOVERY_ATTEMPTED',{subject:'payment_initiation'})){results.failed++;continue}
      try{
        const result=await reconcilePaymentInitiationAuthorized(attempt.payment_id,worker,{maxAttempts});
        if(['PROVIDER_ACCEPTED','DEFINITE_REJECTION'].includes(result.status)){results.initiationRecovered++;await record(attempt.payment_id,'RECOVERY_SUCCEEDED',{subject:'payment_initiation',result:result.status});}
        else await record(attempt.payment_id,result.status==='STALE_CLAIM'?'RECOVERY_CLAIM_LOST':'RECOVERY_INCONCLUSIVE',{subject:'payment_initiation',result:result.status});
      }catch(error){
        if((error as Error).message.includes('cannot be claimed'))results.claimConflicts++;
        else results.failed++;
        await record(attempt.payment_id,'RECOVERY_FAILED',{subject:'payment_initiation',error:(error as Error).message});
      }
    }
  }
  const refundLimit=limit-results.initiationAttempts;
  if(refundLimit>0){
    const [requests]=await pool.query<RowDataPacket[]>(`SELECT r.*,p.reference payment_reference FROM payment_refund_requests r JOIN payment_transactions p ON p.id=r.payment_id WHERE r.retry_count<? AND ((r.status='REQUESTED' AND (r.next_attempt_at IS NULL OR r.next_attempt_at<=NOW())) OR (r.status='PENDING_PROVIDER' AND r.lease_expires_at<=NOW()) OR (r.status='PROVIDER_CONFIRMED' AND (r.next_attempt_at IS NULL OR r.next_attempt_at<=NOW())) OR (r.status='RECONCILIATION_REQUIRED' AND r.provider_refund_reference IS NOT NULL AND (r.next_attempt_at IS NULL OR r.next_attempt_at<=NOW()))) ${args.refundRequestId?'AND r.id=?':''} ${args.paymentId?'AND r.payment_id=?':''} ORDER BY r.updated_at LIMIT ?`,args.refundRequestId?(args.paymentId?[maxAttempts,args.refundRequestId,args.paymentId,refundLimit]:[maxAttempts,args.refundRequestId,refundLimit]):(args.paymentId?[maxAttempts,args.paymentId,refundLimit]:[maxAttempts,refundLimit]));
    for(const request of requests){
      results.refundAttempts++;
      const discoveryEvent=request.status==='PENDING_PROVIDER'?'LEASE_EXPIRED':request.status==='REQUESTED'?'RECOVERY_QUEUED':'RETRY_DUE';
      if(!await record(request.payment_id,discoveryEvent,{subject:'payment_refund',requestId:request.id,status:request.status})||!await record(request.payment_id,'RECOVERY_ATTEMPTED',{subject:'payment_refund',requestId:request.id})){results.failed++;continue}
      try{
        const invoke=()=>refundPaymentAllocations({paymentId:request.payment_id,allocationIds:parseAllocationIds(request.allocation_ids),amount:Number(request.amount),reason:request.reason,actorId:request.requested_by,actorType:request.is_manual?'manual_approver':'system',manualApprovalId:request.manual_approval_id||undefined,requestKey:request.request_key,workerId:`${workerId}-refund-${request.id}`,workerAuth:{workerKey:args.workerKey,workerSecret:args.workerSecret}});
        let result;
        try{result=await invoke()}
        catch(first){if(!(first as {errno?:number}).errno||Number((first as {errno?:number}).errno)!==1213)throw first;await new Promise(r=>setTimeout(r,25));result=await invoke()}
        results.refundsRecovered++;
        await record(request.payment_id,'RECOVERY_SUCCEEDED',{subject:'payment_refund',requestId:request.id,refundId:result.refundId});
      }catch(error){
        if((error as Error).message==='Refund request is already being processed')results.claimConflicts++;
        else{
          results.failed++;
          await pool.query(`UPDATE payment_refund_requests SET retry_count=retry_count+IF(claim_owner=? OR status<>'REQUESTED',0,1),next_attempt_at=DATE_ADD(NOW(),INTERVAL ? SECOND),last_error=?,updated_at=NOW() WHERE id=? AND status IN ('REQUESTED','PENDING_PROVIDER','PROVIDER_CONFIRMED','RECONCILIATION_REQUIRED')`,[`${workerId}-refund-${request.id}`,LEASE_SECONDS,(error as Error).message.slice(0,500),request.id]);
        }
        await record(request.payment_id,'RECOVERY_FAILED',{subject:'payment_refund',requestId:request.id,error:(error as Error).message});
      }
    }
  }
  return results;
}

export async function listReconciliationCases(actorId:number,statuses:string[]=['OPEN','ASSIGNED','ESCALATED']){
  await requireFinanceAdmin(actorId);
  if(!statuses.length)return[];
  const placeholders=statuses.map(()=>'?').join(',');
  const [cases]=await pool.query<RowDataPacket[]>(`SELECT c.*,p.reference payment_reference,p.provider_code,p.amount payment_amount,p.currency,p.status payment_status,p.user_id member_id,r.provider_refund_reference,r.status refund_request_status FROM payment_reconciliation_cases c JOIN payment_transactions p ON p.id=c.payment_id LEFT JOIN payment_refund_requests r ON c.subject_type='REFUND_REQUEST' AND r.id=c.subject_id WHERE c.status IN (${placeholders}) ORDER BY c.created_at`,statuses);
  return cases;
}
export async function getReconciliationCase(actorId:number,caseId:number){
  await requireFinanceAdmin(actorId);
  const [cases]=await pool.query<RowDataPacket[]>(`SELECT c.*,p.reference payment_reference,p.provider_code,p.amount payment_amount,p.currency,p.status payment_status,p.user_id member_id FROM payment_reconciliation_cases c JOIN payment_transactions p ON p.id=c.payment_id WHERE c.id=?`,[caseId]);
  const reconciliationCase=cases[0];if(!reconciliationCase)throw new Error('Reconciliation case not found');
  const [allocations]=await pool.query<RowDataPacket[]>('SELECT id,cycle_year,amount,status FROM payment_cycle_allocations WHERE payment_id=? ORDER BY cycle_year',[reconciliationCase.payment_id]);
  const [refundRequests]=await pool.query<RowDataPacket[]>('SELECT id,status,provider_refund_reference,amount,reason,requested_by,created_at,updated_at FROM payment_refund_requests WHERE payment_id=?',[reconciliationCase.payment_id]);
  const [auditEvents]=await pool.query<RowDataPacket[]>('SELECT id,event_type,actor_type,actor_id,correlation_id,event_data,created_at FROM payment_audit_events WHERE payment_id=? ORDER BY id',[reconciliationCase.payment_id]);
  return{case:reconciliationCase,allocations,refundRequests,auditEvents};
}
export async function claimReconciliationCase(actorId:number,caseId:number,workerId=randomUUID()){
  await requireFinanceAdmin(actorId);
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    const [before]=await c.query<RowDataPacket[]>('SELECT payment_id,status FROM payment_reconciliation_cases WHERE id=? FOR UPDATE',[caseId]);
    const previous=before[0];if(!previous)throw new Error('Reconciliation case not found');
    const [claim]=await c.query<ResultSetHeader>(`UPDATE payment_reconciliation_cases SET status=IF(status='OPEN','ASSIGNED',status),assigned_to=?,assigned_at=NOW(),claim_owner=?,lease_expires_at=DATE_ADD(NOW(),INTERVAL ? SECOND),updated_at=NOW() WHERE id=? AND (status='OPEN' OR (status='ESCALATED' AND (assigned_to IS NULL OR lease_expires_at<=NOW())) OR (status='ASSIGNED' AND lease_expires_at<=NOW()))`,[actorId,workerId,LEASE_SECONDS,caseId]);
    if(claim.affectedRows!==1)throw new Error('Reconciliation case cannot be claimed');
    await audit(c,previous.payment_id,'RECONCILIATION_ASSIGNED','finance_admin',{caseId},actorId,workerId);
    if(previous.status!=='OPEN')await audit(c,previous.payment_id,'LEASE_RENEWED','finance_admin',{subject:'reconciliation_case',caseId,previousStatus:previous.status},actorId,workerId);
    await c.commit();return{caseId,status:previous.status==='OPEN'?'ASSIGNED':previous.status,workerId};
  }catch(e){try{await c.rollback()}catch{}throw e}finally{c.release()}
}
export async function escalateReconciliationCase(actorId:number,caseId:number,reason:string,workerId:string){
  if(!reason)throw new Error('Escalation reason is required');
  await requireFinanceAdmin(actorId);
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    const [rows]=await c.query<RowDataPacket[]>('SELECT * FROM payment_reconciliation_cases WHERE id=? FOR UPDATE',[caseId]);const current=rows[0];
    if(!current||Number(current.assigned_to)!==actorId||current.claim_owner!==workerId||current.status!=='ASSIGNED'||new Date(current.lease_expires_at)<=new Date())throw new Error('Reconciliation case is not claimed by this administrator');
    await c.query("UPDATE payment_reconciliation_cases SET status='ESCALATED',escalation_reason=?,escalated_at=NOW(),assigned_to=NULL,assigned_at=NULL,claim_owner=NULL,lease_expires_at=NULL,updated_at=NOW() WHERE id=?",[reason,caseId]);
    await audit(c,current.payment_id,'RECONCILIATION_ESCALATED','finance_admin',{caseId,reason},actorId,workerId);
    await c.commit();return{caseId,status:'ESCALATED'};
  }catch(e){try{await c.rollback()}catch{}throw e}finally{c.release()}
}
export async function resolveReconciliationCase(args:{actorId:number;caseId:number;workerId:string;action:'NO_ACTION_REQUIRED'|'DUPLICATE_COLLECTION'|'PROVIDER_CONTACT_REQUIRED'|'MANUAL_REFUND_APPROVED'|'MANUAL_REFUND_REJECTED'|'CANCEL_CASE';reason:string}){
  if(!args.reason)throw new Error('Resolution reason is required');
  await requireFinanceAdmin(args.actorId);
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    const [rows]=await c.query<RowDataPacket[]>('SELECT * FROM payment_reconciliation_cases WHERE id=? FOR UPDATE',[args.caseId]);const current=rows[0];
    if(!current||Number(current.assigned_to)!==args.actorId||current.claim_owner!==args.workerId||!['ASSIGNED','ESCALATED'].includes(current.status)||new Date(current.lease_expires_at)<=new Date())throw new Error('Reconciliation case is not claimed by this administrator');
    const next=args.action==='CANCEL_CASE'?'CANCELLED':'RESOLVED';
    await c.query('UPDATE payment_reconciliation_cases SET status=?,resolution_action=?,resolution_reason=?,resolved_by=?,resolved_at=NOW(),updated_at=NOW() WHERE id=?',[next,args.action,args.reason,args.actorId,args.caseId]);
    const event=args.action==='MANUAL_REFUND_APPROVED'?'MANUAL_REFUND_APPROVED':args.action==='MANUAL_REFUND_REJECTED'?'MANUAL_REFUND_REJECTED':'RECONCILIATION_RESOLVED';
    await audit(c,current.payment_id,event,'finance_admin',{caseId:args.caseId,action:args.action,reason:args.reason},args.actorId,args.workerId);
    await c.commit();return{caseId:args.caseId,status:next,action:args.action};
  }catch(e){try{await c.rollback()}catch{}throw e}finally{c.release()}
}

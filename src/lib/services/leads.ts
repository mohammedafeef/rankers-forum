import { adminDb } from '../firebase/admin';
import { COLLECTIONS } from '../constants';
import { Lead, CreateLeadInput, LeadStatus, LeadFollowup, CreateFollowupInput } from '@/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const leadsCollection = adminDb.collection(COLLECTIONS.LEADS);
const followupsCollection = adminDb.collection(COLLECTIONS.LEAD_FOLLOWUPS);
const statsDoc = adminDb.collection(COLLECTIONS.DASHBOARD_STATS).doc('global');
const adminsCollection = adminDb.collection(COLLECTIONS.ADMIN_PROFILES);

/**
 * Create a new lead when student performs college lookup
 */
export async function createLead(data: CreateLeadInput): Promise<Lead> {
  const now = Timestamp.now();
  
  const lead: Omit<Lead, 'id'> = {
    ...data,
    status: 'new',
    callbackRequested: false,
    assignedAdminId: null,
    assignedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const batch = adminDb.batch();
  
  const leadRef = leadsCollection.doc();
  batch.set(leadRef, lead);
  
  // Increment totalRequests in stats
  batch.update(statsDoc, {
    totalRequests: FieldValue.increment(1),
    updatedAt: now,
  });

  await batch.commit();
  
  return { id: leadRef.id, ...lead } as Lead;
}

/**
 * Get a lead by ID
 */
export async function getLeadById(id: string): Promise<Lead | null> {
  const doc = await leadsCollection.doc(id).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return { id: doc.id, ...doc.data() } as Lead;
}

/**
 * Get all leads with optional filters
 */
export async function getLeads(options: {
  status?: LeadStatus;
  assignedAdminId?: string;
  limit?: number;
  startAfter?: string;
} = {}): Promise<Lead[]> {
  let query = leadsCollection.orderBy('createdAt', 'desc');
  
  if (options.status) {
    query = query.where('status', '==', options.status);
  }
  
  if (options.assignedAdminId) {
    query = query.where('assignedAdminId', '==', options.assignedAdminId);
  }
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  if (options.startAfter) {
    const startDoc = await leadsCollection.doc(options.startAfter).get();
    if (startDoc.exists) {
      query = query.startAfter(startDoc);
    }
  }
  
  const snapshot = await query.get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
}

/**
 * Assign a lead to an admin
 */
export async function assignLead(
  leadId: string,
  adminId: string
): Promise<void> {
  const now = Timestamp.now();
  
  const batch = adminDb.batch();
  
  // Update lead
  batch.update(leadsCollection.doc(leadId), {
    assignedAdminId: adminId,
    status: 'assigned',
    assignedAt: now,
    updatedAt: now,
  });
  
  // Increment admin's active leads
  batch.update(adminsCollection.doc(adminId), {
    currentActiveLeads: FieldValue.increment(1),
    updatedAt: now,
  });
  
  // Increment pending callbacks in stats
  batch.update(statsDoc, {
    pendingCallbacks: FieldValue.increment(1),
    updatedAt: now,
  });

  await batch.commit();
}

/**
 * Update lead status
 */
export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<void> {
  const lead = await getLeadById(leadId);
  if (!lead) {
    throw new Error('Lead not found');
  }
  
  const now = Timestamp.now();
  const batch = adminDb.batch();
  
  batch.update(leadsCollection.doc(leadId), {
    status,
    updatedAt: now,
  });
  
  // If completing or closing, decrement admin's active leads and pending callbacks
  if ((status === 'completed' || status === 'closed') && lead.assignedAdminId) {
    batch.update(adminsCollection.doc(lead.assignedAdminId), {
      currentActiveLeads: FieldValue.increment(-1),
      updatedAt: now,
    });
    
    batch.update(statsDoc, {
      pendingCallbacks: FieldValue.increment(-1),
      updatedAt: now,
    });
  }
  
  await batch.commit();
}

/**
 * Request callback for a lead
 */
export async function requestCallback(leadId: string): Promise<void> {
  await leadsCollection.doc(leadId).update({
    callbackRequested: true,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Add a follow-up to a lead
 */
export async function createFollowup(
  adminId: string,
  data: CreateFollowupInput
): Promise<LeadFollowup> {
  const now = Timestamp.now();
  
  const followup: Omit<LeadFollowup, 'id'> = {
    leadId: data.leadId,
    adminId,
    remark: data.remark,
    nextCallbackDate: data.nextCallbackDate 
      ? Timestamp.fromDate(data.nextCallbackDate) 
      : null,
    status: 'pending',
    createdAt: now,
  };

  const batch = adminDb.batch();
  
  const followupRef = followupsCollection.doc();
  batch.set(followupRef, followup);
  
  // Update lead status to in_progress
  batch.update(leadsCollection.doc(data.leadId), {
    status: 'in_progress',
    updatedAt: now,
  });
  
  await batch.commit();
  
  return { id: followupRef.id, ...followup } as LeadFollowup;
}

/**
 * Get follow-ups for a lead
 */
export async function getFollowupsByLeadId(leadId: string): Promise<LeadFollowup[]> {
  const snapshot = await followupsCollection
    .where('leadId', '==', leadId)
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeadFollowup));
}

/**
 * Mark a follow-up as completed
 */
export async function completeFollowup(followupId: string): Promise<void> {
  await followupsCollection.doc(followupId).update({
    status: 'completed',
  });
}

/**
 * Count leads by status
 */
export async function countLeadsByStatus(status: LeadStatus): Promise<number> {
  const snapshot = await leadsCollection
    .where('status', '==', status)
    .count()
    .get();
  
  return snapshot.data().count;
}

/**
 * Get leads assigned to an admin with pending callbacks
 */
export async function getAdminPendingCallbacks(adminId: string): Promise<Lead[]> {
  const snapshot = await leadsCollection
    .where('assignedAdminId', '==', adminId)
    .where('status', 'in', ['assigned', 'in_progress'])
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string } | { success: boolean; token?: string } | undefined

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const APPROVER_ROLES = ['Controller', 'Admin', 'Super Admin']

/**
 * Upload an accounting document — any logged-in user can upload.
 */
export async function uploadDocument(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'errors.notLoggedIn' }

  const month = (formData.get('month') as string)?.trim()
  const doc_type = formData.get('doc_type') as string
  const description = (formData.get('description') as string)?.trim() || null
  const amountStr = formData.get('amount') as string
  const amount = amountStr ? parseFloat(amountStr) : null
  const project_id = (formData.get('project_id') as string) || null

  if (!month || !doc_type) {
    return { error: 'errors.fillRequired' }
  }

  if (doc_type !== 'invoice' && doc_type !== 'receipt') {
    return { error: 'errors.fillRequired' }
  }

  const db = adminClient()

  // Handle file uploads (supports multiple files)
  const files = formData.getAll('files') as File[]
  const validFiles = files.filter(f => f && f.size > 0)

  if (validFiles.length === 0) {
    return { error: 'errors.uploadAttachment' }
  }

  // Upload each file and create a document record
  for (const file of validFiles) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `accounting/${user.id}/${month}/${Date.now()}_${safeName}`

    const fileBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await db.storage
      .from('invoices')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      return { error: 'errors.uploadFailed' }
    }

    const { data: { publicUrl } } = db.storage
      .from('invoices')
      .getPublicUrl(uploadData.path)

    const { error: insertError } = await db
      .from('accounting_documents')
      .insert({
        month,
        doc_type,
        description,
        amount: amount && !isNaN(amount) ? amount : null,
        file_url: publicUrl,
        file_name: file.name,
        project_id: project_id || null,
        uploaded_by: user.id,
      })

    if (insertError) {
      return { error: insertError.message }
    }
  }

  revalidatePath('/accounting')
  return { success: true }
}

/**
 * Delete an accounting document — owner or Controller+ can delete.
 * Storage file is kept for audit trail.
 */
export async function deleteDocument(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'errors.notLoggedIn' }

  const document_id = formData.get('document_id') as string
  if (!document_id) return { error: 'errors.fillRequired' }

  const db = adminClient()

  // Get the document to check ownership
  const { data: doc } = await db
    .from('accounting_documents')
    .select('id, uploaded_by')
    .eq('id', document_id)
    .single<{ id: string; uploaded_by: string }>()

  if (!doc) return { error: 'errors.recordNotFound' }

  // Check permission: owner or approver role
  if (doc.uploaded_by !== user.id) {
    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>()

    if (!profile || !APPROVER_ROLES.includes(profile.role)) {
      return { error: 'errors.noPermission' }
    }
  }

  // Delete from DB (keep storage file for audit)
  const { error } = await db
    .from('accounting_documents')
    .delete()
    .eq('id', document_id)

  if (error) return { error: error.message }

  revalidatePath('/accounting')
  return { success: true }
}

/**
 * Create a magic link for sharing accounting documents — Controller/Admin/Super Admin only.
 */
export async function createMagicLink(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'errors.notLoggedIn' }

  const db = adminClient()

  // Check approver role
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (!profile || !APPROVER_ROLES.includes(profile.role)) {
    return { error: 'errors.noPermission' }
  }

  const label = (formData.get('label') as string)?.trim()
  const month_from = (formData.get('month_from') as string)?.trim()
  const month_to = (formData.get('month_to') as string)?.trim()
  const expires_days = parseInt(formData.get('expires_days') as string) || 30

  if (!label || !month_from || !month_to) {
    return { error: 'errors.fillRequired' }
  }

  // Generate a random hex token
  const tokenBytes = new Uint8Array(24)
  crypto.getRandomValues(tokenBytes)
  const token = Array.from(tokenBytes, b => b.toString(16).padStart(2, '0')).join('')

  const expires_at = new Date()
  expires_at.setDate(expires_at.getDate() + expires_days)

  const { error } = await db
    .from('accounting_links')
    .insert({
      token,
      label,
      month_from,
      month_to,
      created_by: user.id,
      expires_at: expires_at.toISOString(),
    })

  if (error) return { error: error.message }

  revalidatePath('/accounting')
  return { success: true, token }
}

/**
 * Delete a magic link — Controller/Admin/Super Admin only.
 */
export async function deleteMagicLink(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'errors.notLoggedIn' }

  const db = adminClient()

  // Check approver role
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (!profile || !APPROVER_ROLES.includes(profile.role)) {
    return { error: 'errors.noPermission' }
  }

  const link_id = formData.get('link_id') as string
  if (!link_id) return { error: 'errors.fillRequired' }

  const { error } = await db
    .from('accounting_links')
    .delete()
    .eq('id', link_id)

  if (error) return { error: error.message }

  revalidatePath('/accounting')
  return { success: true }
}

/**
 * Get documents by magic link token — PUBLIC, no auth required.
 */
export async function getDocumentsByToken(token: string) {
  if (!token) return null

  const db = adminClient()

  // Find the link
  const { data: link } = await db
    .from('accounting_links')
    .select('id, token, label, month_from, month_to, expires_at, created_at')
    .eq('token', token)
    .single<{
      id: string
      token: string
      label: string
      month_from: string
      month_to: string
      expires_at: string
      created_at: string
    }>()

  if (!link) return null

  // Check expiry
  if (new Date(link.expires_at) < new Date()) return null

  // Get documents in date range
  const { data: documents } = await db
    .from('accounting_documents')
    .select('id, month, doc_type, description, amount, file_url, file_name, project_id, created_at')
    .gte('month', link.month_from)
    .lte('month', link.month_to)
    .order('month', { ascending: false })
    .order('created_at', { ascending: false })
    .returns<{
      id: string
      month: string
      doc_type: string
      description: string | null
      amount: number | null
      file_url: string
      file_name: string
      project_id: string | null
      created_at: string
    }[]>()

  return { documents: documents ?? [], link }
}

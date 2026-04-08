import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/server/firebaseAdmin'
import { verifyBearerUid } from '@/lib/server/verifyBearerUid'
import type { Question } from '@/types/domain'

interface SessionExportRequest {
  joinCode: string
}

export async function POST(request: NextRequest) {
  const uid = await verifyBearerUid(request)
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: SessionExportRequest
  try {
    body = (await request.json()) as SessionExportRequest
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { joinCode } = body
  if (!joinCode || typeof joinCode !== 'string') {
    return NextResponse.json({ error: 'joinCode is required' }, { status: 400 })
  }

  const db = adminDb()

  const sessionSnap = await db.ref(`live_sessions/${joinCode}`).get()
  if (!sessionSnap.exists()) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const session = sessionSnap.val() as {
    hostId: string
    title: string
    startedAt?: string
    endedAt?: string
    joinCode: string
    questions?: Question[]
    responses?: Record<string, Record<string, { answer: string | string[] | number; submittedAt: string }>>
    participants?: Record<string, { name?: string; joinedAt?: string }>
  }

  if (session.hostId !== uid) {
    return NextResponse.json({ error: 'Only the host can export session results' }, { status: 403 })
  }

  const userSnap = await db.ref(`users/${uid}`).get()
  const userData = userSnap.exists() ? userSnap.val() : {}
  const planId: string = userData?.planId ?? 'free'
  const paidPlans = ['basic', 'regular', 'pro']
  if (!paidPlans.includes(planId)) {
    return NextResponse.json({ error: 'Upgrade your plan to export results' }, { status: 403 })
  }

  const questions: Question[] = session.questions ?? []
  const participants = session.participants ?? {}
  const responses = session.responses ?? {}

  const participantMap = new Map<string, string>()
  for (const [pid, p] of Object.entries(participants)) {
    participantMap.set(pid, p.name || 'Guest')
  }

  const csvRows: string[] = []

  csvRows.push(escCsvRow(['Session', session.title]))
  csvRows.push(escCsvRow(['Join Code', session.joinCode]))
  csvRows.push(escCsvRow(['Started', session.startedAt ?? '']))
  csvRows.push(escCsvRow(['Ended', session.endedAt ?? '']))
  csvRows.push(escCsvRow(['Participants', String(Object.keys(participants).length)]))
  csvRows.push('')

  csvRows.push(escCsvRow(['Question #', 'Type', 'Prompt', 'Participant', 'Answer', 'Submitted At']))

  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi]
    const qResponses = responses[q.id] ?? {}

    if (Object.keys(qResponses).length === 0) {
      csvRows.push(escCsvRow([String(qi + 1), q.kind, q.prompt, '', '(no responses)', '']))
      continue
    }

    for (const [pid, r] of Object.entries(qResponses)) {
      const name = participantMap.get(pid) ?? pid
      let answerStr: string

      if (Array.isArray(r.answer)) {
        const labels = resolveLabels(q, r.answer)
        answerStr = labels.join('; ')
      } else if (typeof r.answer === 'number') {
        answerStr = String(r.answer)
      } else {
        answerStr = resolveLabel(q, r.answer as string)
      }

      csvRows.push(escCsvRow([String(qi + 1), q.kind, q.prompt, name, answerStr, r.submittedAt ?? '']))
    }
  }

  const csv = csvRows.join('\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="livezapp-${joinCode}.csv"`,
    },
  })
}

function resolveLabel(q: Question, optionId: string): string {
  if ('options' in q && Array.isArray(q.options)) {
    const opt = q.options.find((o: { id: string; label: string }) => o.id === optionId)
    if (opt) return opt.label
  }
  return optionId
}

function resolveLabels(q: Question, ids: (string | number)[]): string[] {
  return ids.map(id => resolveLabel(q, String(id)))
}

function escCsvField(val: string): string {
  if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

function escCsvRow(fields: string[]): string {
  return fields.map(escCsvField).join(',')
}

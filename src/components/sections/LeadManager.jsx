import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Phone, MapPin, Trash2, ChevronDown, ChevronUp, StickyNote, ArrowRight, UserPlus } from 'lucide-react';

const STORAGE_KEY = 'bossman_leads_v1';

export const STAGES = [
  { id: 'new', label: 'New', color: '#38bdf8' },
  { id: 'contacted', label: 'Contacted', color: '#a78bfa' },
  { id: 'appointment', label: 'Appointment', color: '#fbbf24' },
  { id: 'proposal', label: 'Proposal', color: '#fb923c' },
  { id: 'contract', label: 'Contract Signed', color: '#34d399' },
  { id: 'won', label: 'Won', color: '#10b981' },
  { id: 'lost', label: 'Lost', color: '#f87171' }
];

const SOURCES = ['Facebook Ads', 'Google Ads', 'Referral', 'Door Knock', 'Website', 'Repeat Customer', 'Other'];

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const today = () => new Date().toISOString().slice(0, 10);

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const stageOf = (id) => STAGES.find(s => s.id === id) || STAGES[0];

function seedLeads(businessId) {
  const seeds = {
    solar: [
      { name: 'Maria Gonzalez', phone: '(602) 555-0134', address: '4821 W Cactus Rd, Phoenix, AZ', source: 'Facebook Ads', value: 32000, stage: 'proposal' },
      { name: 'James Whitfield', phone: '(480) 555-0188', address: '1109 E Baseline Rd, Tempe, AZ', source: 'Referral', value: 28500, stage: 'contacted' }
    ],
    construction: [
      { name: 'Deborah Lane', phone: '(623) 555-0142', address: '7702 N 51st Ave, Glendale, AZ', source: 'Google Ads', value: 18000, stage: 'appointment' }
    ],
    homeImprovement: [
      { name: 'Robert Chen', phone: '(480) 555-0161', address: '2210 S Rural Rd, Tempe, AZ', source: 'Website', value: 9500, stage: 'new' }
    ]
  };
  return (seeds[businessId] || []).map(s => ({
    ...s,
    id: uid(),
    createdAt: today(),
    activity: [{ id: uid(), type: 'created', text: 'Sample lead created — replace with your real leads', date: today() }]
  }));
}

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupted storage — fall through to seeds */ }
  return null;
}

const EMPTY_FORM = { name: '', phone: '', address: '', source: SOURCES[0], value: '', stage: 'new', note: '' };

export default function LeadManager({ businessId, businessMeta }) {
  const [allLeads, setAllLeads] = useState(() => {
    const stored = loadAll();
    if (stored) return stored;
    return {
      solar: seedLeads('solar'),
      construction: seedLeads('construction'),
      homeImprovement: seedLeads('homeImprovement')
    };
  });
  const [stageFilter, setStageFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(allLeads)); } catch { /* storage full/unavailable */ }
  }, [allLeads]);

  const leads = allLeads[businessId] || [];
  const setLeads = (updater) => {
    setAllLeads(prev => ({ ...prev, [businessId]: typeof updater === 'function' ? updater(prev[businessId] || []) : updater }));
  };

  const visibleLeads = useMemo(
    () => (stageFilter === 'all' ? leads : leads.filter(l => l.stage === stageFilter)),
    [leads, stageFilter]
  );

  const openValue = leads.filter(l => l.stage !== 'won' && l.stage !== 'lost').reduce((s, l) => s + Number(l.value || 0), 0);
  const wonValue = leads.filter(l => l.stage === 'won').reduce((s, l) => s + Number(l.value || 0), 0);

  const addLead = () => {
    if (!form.name.trim()) return;
    const activity = [{ id: uid(), type: 'created', text: `Lead created (${form.source})`, date: today() }];
    if (form.note.trim()) activity.unshift({ id: uid(), type: 'note', text: form.note.trim(), date: today() });
    setLeads(prev => [{
      id: uid(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      source: form.source,
      value: Number(form.value) || 0,
      stage: form.stage,
      createdAt: today(),
      activity
    }, ...prev]);
    setForm(EMPTY_FORM);
    setShowModal(false);
  };

  const changeStage = (leadId, newStage) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId || l.stage === newStage) return l;
      return {
        ...l,
        stage: newStage,
        activity: [
          { id: uid(), type: 'stage', text: `Stage changed: ${stageOf(l.stage).label} → ${stageOf(newStage).label}`, date: today() },
          ...l.activity
        ]
      };
    }));
  };

  const addNote = (leadId, text) => {
    if (!text.trim()) return;
    setLeads(prev => prev.map(l =>
      l.id === leadId
        ? { ...l, activity: [{ id: uid(), type: 'note', text: text.trim(), date: today() }, ...l.activity] }
        : l
    ));
  };

  const deleteLead = (leadId) => setLeads(prev => prev.filter(l => l.id !== leadId));

  return (
    <section>
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-50">
            {businessMeta.icon} {businessMeta.name} Leads
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {leads.length} {leads.length === 1 ? 'lead' : 'leads'} · Open pipeline <span className="text-slate-200 font-semibold">{fmtMoney(openValue)}</span>
            {wonValue > 0 && <> · Won <span className="text-emerald-400 font-semibold">{fmtMoney(wonValue)}</span></>}
          </p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-slate-950 transition hover:opacity-90"
          style={{ backgroundColor: businessMeta.color }}
        >
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      {/* Stage filter chips */}
      <div className="flex gap-2 flex-wrap mb-6">
        <FilterChip active={stageFilter === 'all'} label={`All (${leads.length})`} color="#94a3b8" onClick={() => setStageFilter('all')} />
        {STAGES.map(s => {
          const count = leads.filter(l => l.stage === s.id).length;
          if (count === 0) return null;
          return (
            <FilterChip
              key={s.id}
              active={stageFilter === s.id}
              label={`${s.label} (${count})`}
              color={s.color}
              onClick={() => setStageFilter(s.id)}
            />
          );
        })}
      </div>

      {/* Lead cards */}
      {visibleLeads.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
          <UserPlus className="w-10 h-10 mx-auto mb-3 text-slate-500" />
          <p className="text-slate-300 font-semibold text-base mb-1">No leads here yet</p>
          <p className="text-slate-400 text-sm">Click "Add Lead" to log your first {businessMeta.name.toLowerCase()} lead.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleLeads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              color={businessMeta.color}
              onStageChange={changeStage}
              onAddNote={addNote}
              onDelete={deleteLead}
            />
          ))}
        </div>
      )}

      {/* Add Lead modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-50 mb-1">Add Lead</h3>
            <p className="text-slate-400 text-sm mb-5">{businessMeta.name} pipeline</p>

            <Field label="Name *">
              <input className="crm-input" autoFocus value={form.name} placeholder="e.g. John Smith"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <input className="crm-input" value={form.phone} placeholder="(602) 555-0100"
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </Field>
              <Field label="Est. Value ($)">
                <input className="crm-input" type="number" min="0" value={form.value} placeholder="0"
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
              </Field>
            </div>
            <Field label="Address">
              <input className="crm-input" value={form.address} placeholder="Street, City, State"
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Source">
                <select className="crm-input" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                  {SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Stage">
                <select className="crm-input" value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="First Note (optional)">
              <input className="crm-input" value={form.note} placeholder="e.g. Wants a quote before Friday"
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </Field>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                className="px-4 py-2.5 rounded-lg text-slate-950 text-sm font-bold transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: businessMeta.color }}
                disabled={!form.name.trim()}
                onClick={addLead}
              >
                Save Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function FilterChip({ active, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
        active ? 'text-slate-950' : 'text-slate-300 hover:text-slate-100'
      }`}
      style={{
        backgroundColor: active ? color : 'transparent',
        borderColor: active ? color : '#334155'
      }}
    >
      {label}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-slate-300 text-[13px] font-semibold uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function LeadCard({ lead, color, onStageChange, onAddNote, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const stage = stageOf(lead.stage);
  const noteCount = lead.activity.filter(a => a.type === 'note').length;

  const submitNote = () => {
    if (!noteText.trim()) return;
    onAddNote(lead.id, noteText);
    setNoteText('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
      {/* Top row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[220px]">
          <div className="flex items-center gap-3 flex-wrap mb-1.5">
            <span className="text-lg font-bold text-slate-50">{lead.name}</span>
            <span
              className="text-[13px] font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: `${stage.color}22`, color: stage.color, border: `1px solid ${stage.color}55` }}
            >
              {stage.label}
            </span>
            {lead.value > 0 && (
              <span className="text-base font-bold" style={{ color }}>{fmtMoney(lead.value)}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-400">
            {lead.phone && (
              <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-1.5 hover:text-slate-200 transition">
                <Phone className="w-3.5 h-3.5" /> {lead.phone}
              </a>
            )}
            {lead.address && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {lead.address}</span>}
            <span>Source: <span className="text-slate-300">{lead.source}</span></span>
            <span>Added {fmtDate(lead.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="crm-input !w-auto text-sm"
            value={lead.stage}
            onChange={e => onStageChange(lead.id, e.target.value)}
            aria-label={`Stage for ${lead.name}`}
          >
            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button
            onClick={() => setExpanded(x => !x)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition"
            aria-expanded={expanded}
          >
            <StickyNote className="w-4 h-4" />
            {noteCount > 0 ? `Notes (${noteCount})` : 'Notes'}
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <button className="px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-400 transition" onClick={() => onDelete(lead.id)}>
                Delete
              </button>
              <button className="px-3 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition" onClick={() => setConfirmDelete(false)}>
                Keep
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-lg border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-400/40 transition"
              aria-label={`Delete ${lead.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Notes + activity log */}
      {expanded && (
        <div className="mt-5 pt-5 border-t border-slate-800">
          <div className="flex gap-2 mb-5">
            <input
              className="crm-input flex-1"
              placeholder="Add a note… (e.g. Left voicemail, follow up Thursday)"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitNote()}
            />
            <button
              className="px-4 py-2 rounded-lg text-slate-950 text-sm font-bold transition hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: color }}
              disabled={!noteText.trim()}
              onClick={submitNote}
            >
              Add Note
            </button>
          </div>

          <div className="space-y-3">
            {lead.activity.map(item => (
              <div key={item.id} className="flex items-start gap-3 bg-slate-950/60 border border-slate-800 rounded-lg px-4 py-3">
                <span className="mt-0.5 flex-shrink-0">
                  {item.type === 'note' && <StickyNote className="w-4 h-4 text-amber-400" />}
                  {item.type === 'stage' && <ArrowRight className="w-4 h-4 text-sky-400" />}
                  {item.type === 'created' && <UserPlus className="w-4 h-4 text-emerald-400" />}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm leading-relaxed ${item.type === 'note' ? 'font-semibold text-slate-100' : 'text-slate-300'}`}>
                    {item.text}
                  </p>
                  <p className="text-slate-500 text-[13px] mt-1">{fmtDate(item.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

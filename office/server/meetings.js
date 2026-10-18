"use strict";
// Team meetings (panel 💬 Rapat): the chosen agents take turns speaking about a
// topic, Hermes opens the meeting and closes it with minutes (summary,
// decisions, action items). One meeting at a time.
//
// Events broadcast to the office (event "meeting"):
//   { state: "started", meeting }                     who, topic, rounds
//   { state: "speaking", id, agentId }                a turn begins
//   { state: "delta", id, agentId, text }             the turn so far
//   { state: "turn", id, agentId, text }              a turn is finished
//   { state: "ended", id, minutes } | { state: "error", id, error } | { state: "stopped", id }

const MAX_PARTICIPANTS = 5;
const MAX_ROUNDS = 3;
const TURN_IDLE_MS = 90_000; // a speaker whose model goes silent this long is skipped

const createMeetings = ({ agentRegistry, orchestratorId, model, streamOneTurn, recordUsage, systemPromptFor, broadcast, onMinutes, forwarder, sanitize }) => {
  let current = null; // { id, topic, participants, rounds, transcript, state, stopped, minutes }

  const nameOf = (id) => agentRegistry.get(id)?.name ?? id;
  const emit = (payload) => broadcast({ type: "event", event: "meeting", payload });
  const publicView = (m) => m && {
    id: m.id, topic: m.topic, participants: m.participants, rounds: m.rounds,
    transcript: m.transcript, state: m.state, minutes: m.minutes ?? null, speaking: m.speaking ?? null,
  };

  // Plain text for the panel and minutes: no markdown bold/headings.
  const plain = (s) => String(s || "").replace(/\*\*|__/g, "").replace(/^#+\s*/gm, "").trim();

  const transcriptText = (m) => m.transcript.map((t) => `[${nameOf(t.agentId)}]: ${t.text}`).join("\n\n") || "(belum ada)";

  const meetingRules = (m, agentId) => {
    const who = [orchestratorId, ...m.participants].map((id) => {
      const a = agentRegistry.get(id);
      return `${a?.name ?? id}${a?.role ? ` (${a.role})` : ""}`;
    }).join(", ");
    return `\n\nKamu sedang dalam rapat tim di Ruang Rapat bersama: ${who}.
Topik rapat: ${m.topic}
Aturan rapat: bicara sebagai ${nameOf(agentId)} dari sudut pandang peranmu, 2 sampai 4 kalimat saja.
Tanggapi poin peserta lain bila relevan, beri usulan atau risiko yang konkret, jangan mengulang yang sudah dikatakan.
Jangan menjalankan tools, perintah terminal, atau mengubah file selama rapat; ini hanya diskusi.`;
  };

  // One speaker's turn: streams into the office and returns the final text.
  const speak = async (m, agentId, instruction) => {
    const agent = agentRegistry.get(agentId);
    const system = `${systemPromptFor(agent)}${meetingRules(m, agentId)}`;
    const user = `Transkrip rapat sejauh ini:\n\n${transcriptText(m)}\n\n${instruction}`;
    m.speaking = agentId;
    emit({ state: "speaking", id: m.id, agentId });
    const result = await streamOneTurn(
      [{ role: "system", content: system }, { role: "user", content: user }],
      agent?.settings?.model || model, [],
      (text) => emit({ state: "delta", id: m.id, agentId, text }),
      () => m.stopped,
      forwarder(agentId, `agent:${agentId}:main`),
      TURN_IDLE_MS,
    );
    m.speaking = null;
    if (recordUsage) recordUsage(agentId, result);
    const text = plain(result.textContent);
    if (m.stopped) return null;
    m.transcript.push({ agentId, text, at: Date.now() });
    emit({ state: "turn", id: m.id, agentId, text });
    return text;
  };

  const run = async (m) => {
    try {
      await speak(m, orchestratorId, "Buka rapat ini sebagai moderator: jelaskan tujuan rapat dan apa yang perlu diputuskan, maksimal 3 kalimat. Lalu persilakan peserta.");
      for (let round = 1; round <= m.rounds && !m.stopped; round++) {
        for (const agentId of m.participants) {
          if (m.stopped) break;
          try {
            await speak(m, agentId, `Giliranmu bicara, ${nameOf(agentId)} (putaran ${round} dari ${m.rounds}).`);
          } catch (err) {
            // one silent speaker does not end the meeting
            m.speaking = null;
            const text = `(tidak bisa menjawab: ${sanitize(err)})`;
            m.transcript.push({ agentId, text, at: Date.now(), error: true });
            emit({ state: "turn", id: m.id, agentId, text, error: true });
          }
        }
      }
      if (m.stopped) return;
      const minutes = await speak(m, orchestratorId,
        "Tutup rapat dan tulis notulen dalam format ini (singkat, Bahasa Indonesia):\nRingkasan: 2-3 kalimat.\nKeputusan:\n- ...\nAction item:\n- Nama: tugas\nGunakan nama peserta yang hadir.");
      if (!minutes) return;
      m.state = "ended";
      m.minutes = minutes;
      emit({ state: "ended", id: m.id, minutes });
      onMinutes(m, minutes);
    } catch (err) {
      m.state = "error";
      emit({ state: "error", id: m.id, error: sanitize(err) });
    } finally {
      m.speaking = null;
    }
  };

  return {
    start({ topic, participants, rounds }) {
      if (current && current.state === "running") throw new Error("masih ada rapat yang berjalan; akhiri dulu");
      const cleanTopic = String(topic || "").trim().slice(0, 2000);
      if (!cleanTopic) throw new Error("topik rapat wajib diisi");
      const ids = [...new Set((Array.isArray(participants) ? participants : []).map(String))]
        .filter((id) => id !== orchestratorId && agentRegistry.has(id));
      if (!ids.length) throw new Error("pilih minimal satu peserta");
      if (ids.length > MAX_PARTICIPANTS) throw new Error(`maksimal ${MAX_PARTICIPANTS} peserta (kursi di Ruang Rapat terbatas)`);
      const m = {
        id: `rapat-${Date.now().toString(36)}`, topic: cleanTopic, participants: ids,
        rounds: Math.min(MAX_ROUNDS, Math.max(1, Number(rounds) || 1)),
        transcript: [], state: "running", stopped: false, startedAt: Date.now(),
      };
      current = m;
      emit({ state: "started", meeting: publicView(m) });
      run(m);
      return publicView(m);
    },
    stop(id) {
      if (!current || (id && current.id !== id) || current.state !== "running") return false;
      current.stopped = true;
      current.state = "stopped";
      emit({ state: "stopped", id: current.id });
      return true;
    },
    current: () => publicView(current),
    MAX_PARTICIPANTS,
    MAX_ROUNDS,
  };
};

module.exports = { createMeetings };

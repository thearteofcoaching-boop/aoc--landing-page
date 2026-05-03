const { Resend } = require('resend');
const ELLEE_VOICE = require('./ellee-voice');

const CATEGORY_MAX = {
  'Class Structure': 16,
  'Engagement': 16,
  'Skill Development': 20,
  'Parent Experience': 16,
};

function scoreLabel(pct) {
  if (pct >= 80) return 'Strong';
  if (pct >= 60) return 'Developing';
  if (pct >= 40) return 'Needs Attention';
  return 'Priority Area';
}

function buildPrompt(name, categoryResults) {
  const sorted = [...categoryResults].sort((a, b) => a.pct - b.pct);
  const weakest = sorted.slice(0, 2);
  const strongest = sorted[sorted.length - 1];

  const detailedAnswers = categoryResults.map(cat => {
    const header = `${cat.name.toUpperCase()} — ${cat.pct}% (${scoreLabel(cat.pct)})`;
    const qs = cat.questions.map(q =>
      `  Q: ${q.questionText}\n  → "${q.answerText}" (${q.score}/4)`
    ).join('\n\n');
    return `${header}\n${qs}`;
  }).join('\n\n---\n\n');

  return `${ELLEE_VOICE}

---

NOW WRITE THE FEEDBACK EMAIL FOR THIS COACH

Coach name: ${name}

ASSESSMENT SCORES:
${categoryResults.map(c => `• ${c.name}: ${c.pct}% — ${scoreLabel(c.pct)}`).join('\n')}

Their strongest area: ${strongest.name} (${strongest.pct}%)
Their biggest gaps: ${weakest.map(w => `${w.name} (${w.pct}%)`).join(' and ')}

THEIR ANSWERS IN DETAIL:
${detailedAnswers}

---

WRITE THE EMAIL FOLLOWING THIS STRUCTURE (280–320 words):
1. Open with their name — 1 direct sentence, no fluff
2. Acknowledge what's working (${strongest.name}) — 1–2 sentences, make them feel seen but don't over-praise
3. Call out their biggest gap (${weakest[0].name}, ${weakest[0].pct}%) — reference their actual answers, name the real problem, give 2–3 specific adjustments they can make this week
4. Address their second gap (${weakest[1].name}, ${weakest[1].pct}%) — same approach, practical and specific
5. Close with your CTA. The free 15-minute discovery call. Natural, not pushy.

Rules:
- Sound exactly like Ellee talking to a coach. Direct, observational, no generic advice.
- Reference their specific answers. Not just the category scores.
- Use your phrases naturally where they genuinely fit.
- Never use em dashes (the — symbol). Use a period or comma instead.
- No subject line. No sign-off. Email body only.
- Start with: "Hi ${name},"`;

}

function buildEmailHTML(name, analysisText, categoryResults) {
  const paragraphs = analysisText
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p style="margin:0 0 18px;line-height:1.75;color:#1a2a3a;font-size:15px;">${p.trim().replace(/\n/g, '<br>')}</p>`)
    .join('');

  const scoreRows = categoryResults
    .sort((a, b) => b.pct - a.pct)
    .map(cat => {
      const color = cat.pct >= 75 ? '#22c55e' : cat.pct >= 50 ? '#F7C948' : '#ef4444';
      return `
        <tr>
          <td style="padding:10px 0;color:#555;font-size:13px;white-space:nowrap;width:140px;">${cat.name}</td>
          <td style="padding:10px 0;padding-left:14px;">
            <div style="background:#e5e7eb;border-radius:4px;height:7px;overflow:hidden;">
              <div style="background:${color};height:7px;width:${cat.pct}%;border-radius:4px;"></div>
            </div>
          </td>
          <td style="padding:10px 0;padding-left:12px;color:#111;font-size:13px;font-weight:700;white-space:nowrap;">${cat.pct}%</td>
        </tr>`;
    }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your BJJ Coaching Assessment</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;">
<tr><td align="center" style="padding:40px 16px;">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;max-width:600px;width:100%;">

    <!-- Header -->
    <tr><td style="background:#0D1B2A;padding:32px;text-align:center;">
      <p style="margin:0 0 6px;color:#E91E8C;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Arte of Coaching</p>
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;line-height:1.3;">Your BJJ Coaching Assessment</h1>
    </td></tr>

    <!-- Score panel -->
    <tr><td style="padding:28px 32px;background:#f9f9f9;border-bottom:1px solid #ebebeb;">
      <p style="margin:0 0 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#999;">Your Results</p>
      <table width="100%" cellpadding="0" cellspacing="0">${scoreRows}</table>
    </td></tr>

    <!-- Analysis -->
    <tr><td style="padding:32px;">
      ${paragraphs}
    </td></tr>

    <!-- CTA -->
    <tr><td style="background:#0D1B2A;padding:32px;text-align:center;">
      <p style="margin:0 0 18px;color:#9ca3af;font-size:14px;">Ready to take your kids program to the next level?</p>
      <a href="https://stan.store/thearteofcoaching/p/book-a-free-discovery-call-svoynj4b" style="display:inline-block;background:#E91E8C;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:16px;">
        Book a Free Discovery Call
      </a>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:20px 32px;text-align:center;border-top:1px solid #f0f0f0;">
      <p style="margin:0;color:#aaa;font-size:11px;">© 2025 Arte of Coaching · You're receiving this because you completed our coaching assessment.</p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, answers } = req.body;

    console.log('analyze: received request for', email);
    console.log('analyze: API key prefix:', (process.env.ANTHROPIC_API_KEY || '').slice(0, 16));

    if (!name || !email || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Group answers by category and compute scores
    const categoryMap = {};
    for (const answer of answers) {
      if (!categoryMap[answer.category]) {
        categoryMap[answer.category] = { questions: [], totalScore: 0 };
      }
      categoryMap[answer.category].questions.push({
        questionText: answer.questionText,
        answerText: answer.text,
        score: answer.score,
      });
      categoryMap[answer.category].totalScore += answer.score;
    }

    const categoryResults = Object.entries(categoryMap).map(([catName, data]) => {
      const max = CATEGORY_MAX[catName] || data.questions.length * 4;
      const pct = Math.round((data.totalScore / max) * 100);
      return { name: catName, pct, questions: data.questions };
    });

    // Build prompt and call Claude via direct HTTP (no SDK)
    const prompt = buildPrompt(name, categoryResults);

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const claudeData = await claudeRes.json();
    console.log('analyze: Claude status', claudeRes.status, JSON.stringify(claudeData).slice(0, 200));

    if (!claudeRes.ok) {
      throw new Error(`Claude API error: ${claudeRes.status} ${JSON.stringify(claudeData)}`);
    }

    const analysisText = claudeData.content[0].text;
    console.log('analyze: Claude response received, sending email');

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'coaching@thearteofcoaching.com.au',
      to: email,
      subject: `${name}, your BJJ coaching assessment is here`,
      html: buildEmailHTML(name, analysisText, categoryResults),
    });

    // Submit to AWeber (fire and forget — don't block the response)
    const aweberParams = new URLSearchParams({
      listname: 'awlist6934166',
      name,
      email,
      redirect: 'https://www.aweber.com/thankyou.htm',
      meta_adtracking: 'quiz-assessment',
      submit: 'Submit',
    });
    fetch('https://www.aweber.com/scripts/addlead.pl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: aweberParams.toString(),
    }).catch(err => console.error('AWeber error:', err));

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('analyze error:', err.message || err);
    console.error('analyze error status:', err.status);
    console.error('analyze error body:', JSON.stringify(err.error || err.body || {}));
    return res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }
};

// ====================================================================
// FUNZIONE SERVERLESS — riceve i dati del form di preventivo e
// invia un'email tramite Resend (https://resend.com).
//
// Vercel esegue automaticamente questo file come endpoint:
//   POST /api/send-quote
//
// IMPORTANTE: serve una variabile d'ambiente RESEND_API_KEY,
// da impostare su Vercel (Settings → Environment Variables).
// Vedi le istruzioni fornite insieme a questo file.
// ====================================================================

export default async function handler(req, res) {
  // Accettiamo solo richieste POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { nome, email, tipoRichiesta, messaggio } = req.body || {};

  // Validazione minima lato server (oltre a quella del browser)
  if (!nome || !email || !messaggio) {
    return res.status(400).json({ error: 'Compila tutti i campi obbligatori.' });
  }

  // Controllo base sul formato email, per evitare invii a indirizzi non validi
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Indirizzo email non valido.' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // 'from' deve usare un dominio verificato su Resend, oppure
        // il dominio di test "onboarding@resend.dev" (solo per prova,
        // le email reali arrivano comunque ma con quel mittente).
        from: 'Sito Tipografia San Giuseppe <onboarding@resend.dev>',
        to: ['info@tsgarma.it'],
        reply_to: email,
        subject: `Nuova richiesta dal sito — ${tipoRichiesta || 'Generale'}`,
        html: `
          <h2>Nuova richiesta dal sito</h2>
          <p><strong>Nome:</strong> ${escapeHtml(nome)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Tipo richiesta:</strong> ${escapeHtml(tipoRichiesta || 'N/D')}</p>
          <p><strong>Messaggio:</strong></p>
          <p>${escapeHtml(messaggio).replace(/\n/g, '<br>')}</p>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Errore Resend:', errorData);
      return res.status(502).json({ error: 'Invio email non riuscito. Riprova più tardi.' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Errore del server:', error);
    return res.status(500).json({ error: 'Errore del server. Riprova più tardi.' });
  }
}

// Piccola funzione di sicurezza: evita che testo inserito nel form
// possa "rompere" l'HTML dell'email (escaping base).
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

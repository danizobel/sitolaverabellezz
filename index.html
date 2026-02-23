export async function onRequest(context) {
    // 1. Definiamo i permessi CORS per evitare blocchi dal browser
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    // 2. Risposta di sicurezza "Preflight" obbligatoria per Cloudflare
    if (context.request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    // 3. Blocca richieste che non sono POST
    if (context.request.method !== "POST") {
        return new Response("Metodo non consentito", { status: 405, headers: corsHeaders });
    }

    try {
        const body = await context.request.json();
        const { orderId, totalAmount, orarioSelezionato, dataOrdine } = body;
        
        const slotKey = `${dataOrdine}_${orarioSelezionato}`;
        const MAX_ORDINI_PER_SLOT = 4; // Cambia questo numero per aumentare/diminuire il limite
        
        // Verifica che il Database sia collegato
        if (!context.env.SLOT_ORARI) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: "Database SLOT_ORARI non collegato. Controlla le impostazioni di Cloudflare." 
            }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
        
        // Controllo disponibilità orario
        let ordiniAttuali = await context.env.SLOT_ORARI.get(slotKey);
        ordiniAttuali = ordiniAttuali ? parseInt(ordiniAttuali) : 0;

        if (ordiniAttuali >= MAX_ORDINI_PER_SLOT) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: `L'orario ${orarioSelezionato} è pieno. Scegli un altro orario.` 
            }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        // Creazione Crittografia Nexi
        const amountCents = Math.round(totalAmount * 100); 
        const divisa = "EUR";
        const stringToSign = `alias=${context.env.NEXI_ALIAS}&codTrans=${orderId}&divisa=${divisa}&importo=${amountCents}&mac_key=${context.env.NEXI_MAC_KEY}`;
        
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(stringToSign);
        const hashBuffer = await crypto.subtle.digest('SHA-1', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const mac = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Risposta OK al frontend
        return new Response(JSON.stringify({
            success: true,
            nexiParams: {
                alias: context.env.NEXI_ALIAS,
                codTrans: orderId,
                divisa: divisa,
                importo: amountCents,
                mac: mac,
                url: "https://sitolaverabellezz.pages.dev/successo.html", // <-- IMPORTANTE: INSERISCI IL TUO LINK QUI
                url_back: "https://sitolaverabellezz.pages.dev/errore.html", // <-- IMPORTANTE: INSERISCI IL TUO LINK QUI
            }
        }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { 
            status: 500, 
            headers: { "Content-Type": "application/json", ...corsHeaders } 
        });
    }
}
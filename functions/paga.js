// file: functions/paga.js
const MAX_ASPORTO_PER_SLOT = 1;   
const MAX_DOMICILIO_PER_SLOT = 1; 

export async function onRequest(context) {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Api-Key, Correlation-Id",
    };

    if (context.request.method === "OPTIONS") { return new Response(null, { headers: corsHeaders }); }
    if (context.request.method !== "POST") { return new Response("Metodo non consentito", { status: 405, headers: corsHeaders }); }

    try {
        const body = await context.request.json();
        const { orderId, totalAmount, orarioSelezionato, dataOrdine, tipoOrdine } = body;
        const slotKey = `${dataOrdine}_${tipoOrdine}_${orarioSelezionato}`;
        const limiteMax = (tipoOrdine === "delivery") ? MAX_DOMICILIO_PER_SLOT : MAX_ASPORTO_PER_SLOT;
        
        if (!context.env.SLOT_ORARI) throw new Error("Database SLOT_ORARI mancante");

        let ordiniAttuali = await context.env.SLOT_ORARI.get(slotKey);
        if ((ordiniAttuali ? parseInt(ordiniAttuali) : 0) >= limiteMax) {
            return new Response(JSON.stringify({ success: false, error: `L'orario ${orarioSelezionato} è pieno. Scegli un altro orario.` }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        const amountCents = Math.round(totalAmount * 100); 

        // CHIAMATA DIRETTA AL NUOVO SISTEMA NEXI (XPay Build / Hosted Payment Page API)
        const nexiUrl = "https://xpaysandbox.nexigroup.com/api/phoenix-0.0/psp/api/v1/orders/hpp"; // URL DI TEST
        // (Per la produzione sarà: https://xpay.nexigroup.com/api/phoenix-0.0/psp/api/v1/orders/hpp)

        const nexiPayload = {
            "order": {
                "orderId": orderId,
                "amount": amountCents,
                "currency": "EUR"
            },
            "paymentSession": {
                "actionType": "PAY",
                "amount": amountCents,
                "resultUrl": "https://sitolaverabellezz.pages.dev/successo.html", // <-- INSERISCI IL TUO LINK REALE
                "cancelUrl": "https://sitolaverabellezz.pages.dev/errore.html",     // <-- INSERISCI IL TUO LINK REALE
				"notificationUrl": "https://sitolaverabellezz.pages.dev/webhook" //
            }
        };

        const nexiResponse = await fetch(nexiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Api-Key": context.env.NEXI_MAC_KEY, // Cloudflare ti passerà la tua Api Key 2e570a58...
                "Correlation-Id": crypto.randomUUID()
            },
            body: JSON.stringify(nexiPayload)
        });

        const nexiData = await nexiResponse.json();

        if (nexiData.hostedPage) {
            // Ritorna direttamente l'URL di Nexi a cui far saltare l'utente!
            return new Response(JSON.stringify({ success: true, redirectUrl: nexiData.hostedPage }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        } else {
            throw new Error("Errore Nexi: Impossibile generare la pagina di cassa.");
        }

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
}
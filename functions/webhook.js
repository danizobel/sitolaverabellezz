// file: functions/webhook.js
export async function onRequest(context) {
    // Permessi CORS per far funzionare la chiamata anche dalla pagina di successo
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    if (context.request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (context.request.method !== "POST") return new Response("Metodo non consentito", { status: 405 });

    try {
        const contentType = context.request.headers.get("content-type") || "";
        let codTrans = "";

        if (contentType.includes("application/json")) {
            const body = await context.request.json();
            if (body.order && body.order.orderId) {
                codTrans = body.order.orderId;
            }
        }

        if (codTrans) {
            if (!context.env.SLOT_ORARI) return new Response("DB Mancante", { status: 500 });

            // ANTI-DOPPIONE: Controlla se abbiamo già scalato questo specifico ordine
            const isProcessed = await context.env.SLOT_ORARI.get(`PROCESSED_${codTrans}`);
            if (isProcessed) {
                return new Response("Già processato", { status: 200, headers: corsHeaders });
            }

            const parts = codTrans.split("_");
            const orarioPagato = parts[parts.length - 1]; 
            const tipoOrdine = parts[parts.length - 2];   
            
            const dateObj = new Date();
            const todayStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            const slotKey = `${todayStr}_${tipoOrdine}_${orarioPagato}`;

            // Scala il posto per l'orario
            let ordiniAttuali = await context.env.SLOT_ORARI.get(slotKey);
            ordiniAttuali = ordiniAttuali ? parseInt(ordiniAttuali) : 0;
            await context.env.SLOT_ORARI.put(slotKey, (ordiniAttuali + 1).toString());

            // Segna questo ordine come "COMPLETATO" (scade da solo dopo 24h per non riempire il DB)
            await context.env.SLOT_ORARI.put(`PROCESSED_${codTrans}`, "1", { expirationTtl: 86400 });

            return new Response("OK", { status: 200, headers: corsHeaders });
        }
        
        return new Response("Dati non validi", { status: 400 });

    } catch (err) {
        return new Response(err.message, { status: 500 });
    }
}
// file: functions/orari.js
export async function onRequest(context) {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    if (context.request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const url = new URL(context.request.url);
        const tipoOrdine = url.searchParams.get("tipo") || "takeaway";
        const dataOrdine = url.searchParams.get("data");
        
        // ⚠️ ASSICURATI CHE QUESTI NUMERI SIANO UGUALI A QUELLI CHE HAI IN paga.js
        const MAX_ASPORTO_PER_SLOT = 1;
        const MAX_DOMICILIO_PER_SLOT = 1;
        const limiteMax = (tipoOrdine === "delivery") ? MAX_DOMICILIO_PER_SLOT : MAX_ASPORTO_PER_SLOT;

        if (!context.env.SLOT_ORARI) throw new Error("Database mancante");

        let orariDisponibili = [];
        let keysToFetch = [];
        let slotNames = [];

        // Genera tutti gli orari dalle 19:00 alle 23:30 e chiede al DB quanti ordini ci sono
        for(let h = 19; h <= 23; h++) {
            for(let m = 0; m < 60; m += 15) {
                if (h === 23 && m > 30) continue; 
                let timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                slotNames.push(timeStr);
                keysToFetch.push(context.env.SLOT_ORARI.get(`${dataOrdine}_${tipoOrdine}_${timeStr}`));
            }
        }

        // Aspetta tutte le risposte dal database contemporaneamente (molto più veloce)
        let results = await Promise.all(keysToFetch);
        
        for(let i = 0; i < results.length; i++) {
            let count = results[i] ? parseInt(results[i]) : 0;
            // Se i posti occupati sono MINORI del limite, l'orario è disponibile!
            if (count < limiteMax) {
                orariDisponibili.push(slotNames[i]);
            }
        }

        return new Response(JSON.stringify({ success: true, orari: orariDisponibili }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
}
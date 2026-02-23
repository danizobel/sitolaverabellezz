// file: functions/paga.js
const MAX_ASPORTO_PER_SLOT = 4;   // Quanti asporti ogni 15 min
const MAX_DOMICILIO_PER_SLOT = 2; // Quante consegne ogni 15 min

export async function onRequest(context) {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    if (context.request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }
    if (context.request.method !== "POST") {
        return new Response("Metodo non consentito", { status: 405, headers: corsHeaders });
    }

    try {
        const body = await context.request.json();
        const { orderId, totalAmount, orarioSelezionato, dataOrdine, tipoOrdine } = body;
        
        // Chiave divisa per tipo: es. "2026-02-23_delivery_20:15"
        const slotKey = `${dataOrdine}_${tipoOrdine}_${orarioSelezionato}`;
        
        // Assegna il limite giusto in base al tipo di ordine
        const limiteMax = (tipoOrdine === "delivery") ? MAX_DOMICILIO_PER_SLOT : MAX_ASPORTO_PER_SLOT;
        
        if (!context.env.SLOT_ORARI) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: "Database SLOT_ORARI non collegato. Controlla le impostazioni di Cloudflare." 
            }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
        
        // Controllo disponibilità
        let ordiniAttuali = await context.env.SLOT_ORARI.get(slotKey);
        ordiniAttuali = ordiniAttuali ? parseInt(ordiniAttuali) : 0;

        if (ordiniAttuali >= limiteMax) {
            const tipoText = (tipoOrdine === "delivery") ? "Consegna a Domicilio" : "Ritiro al Locale";
            return new Response(JSON.stringify({ 
                success: false, 
                error: `Spiacenti, per il servizio "${tipoText}" l'orario ${orarioSelezionato} è pieno. Scegli un altro orario.` 
            }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        const amountCents = Math.round(totalAmount * 100); 
        const divisa = "EUR";
        const stringToSign = `alias=${context.env.NEXI_ALIAS}&codTrans=${orderId}&divisa=${divisa}&importo=${amountCents}&mac_key=${context.env.NEXI_MAC_KEY}`;
        
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(stringToSign);
        const hashBuffer = await crypto.subtle.digest('SHA-1', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const mac = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return new Response(JSON.stringify({
            success: true,
            nexiParams: {
                alias: context.env.NEXI_ALIAS,
                codTrans: orderId,
                divisa: divisa,
                importo: amountCents,
                mac: mac,
                url: "https://IL_TUO_SITO.pages.dev/successo.html", // <-- AGGIORNA IL LINK
                url_back: "https://IL_TUO_SITO.pages.dev/errore.html", // <-- AGGIORNA IL LINK
            }
        }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { 
            status: 500, 
            headers: { "Content-Type": "application/json", ...corsHeaders } 
        });
    }
}
// file: functions/webhook.js
export async function onRequest(context) {
    if (context.request.method !== "POST") return new Response("Metodo non consentito", { status: 405 });

    try {
        const contentType = context.request.headers.get("content-type") || "";
        let codTrans = "";

        // Legge i dati in formato JSON inviati dalle nuove API di Nexi
        if (contentType.includes("application/json")) {
            const body = await context.request.json();
            // Cerca l'ID dell'ordine nel payload di Nexi
            if (body.order && body.order.orderId) {
                codTrans = body.order.orderId;
            }
        }

        // Se ha trovato l'ID (es: LVB-MR-12345_delivery_20:15), scala il posto
        if (codTrans) {
            const parts = codTrans.split("_");
            const orarioPagato = parts[parts.length - 1]; 
            const tipoOrdine = parts[parts.length - 2];   
            
            const dateObj = new Date();
            const todayStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            const slotKey = `${todayStr}_${tipoOrdine}_${orarioPagato}`;

            if (context.env.SLOT_ORARI) {
                let ordiniAttuali = await context.env.SLOT_ORARI.get(slotKey);
                ordiniAttuali = ordiniAttuali ? parseInt(ordiniAttuali) : 0;
                await context.env.SLOT_ORARI.put(slotKey, (ordiniAttuali + 1).toString());
            }

            return new Response("OK", { status: 200 });
        }
        
        return new Response("Dati non validi", { status: 400 });

    } catch (err) {
        return new Response(err.message, { status: 500 });
    }
}
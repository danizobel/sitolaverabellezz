export async function onRequest(context) {
    if (context.request.method !== "POST") {
        return new Response("Metodo non consentito", { status: 405 });
    }

    try {
        const formData = await context.request.formData();
        const esito = formData.get("esito");
        const codTrans = formData.get("codTrans"); 
        
        if (esito === "OK" && codTrans) {
            const parts = codTrans.split("_");
            const orarioPagato = parts[parts.length - 1]; 
            
            const dateObj = new Date();
            const todayStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            const slotKey = `${todayStr}_${orarioPagato}`;

            if (context.env.SLOT_ORARI) {
                let ordiniAttuali = await context.env.SLOT_ORARI.get(slotKey);
                ordiniAttuali = ordiniAttuali ? parseInt(ordiniAttuali) : 0;
                await context.env.SLOT_ORARI.put(slotKey, (ordiniAttuali + 1).toString());
            }

            return new Response("OK", { status: 200 });
        }
        
        return new Response("KO", { status: 400 });
    } catch (err) {
        return new Response("Errore server", { status: 500 });
    }
}
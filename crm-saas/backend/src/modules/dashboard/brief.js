import { activity } from './activity.js';

let budgetStart = 0;
let requests = 0;
export async function brief(req, res, next) {
    try {
        const data = await activity(req.user.companyId);
        const offline = () => res.json({ source:'local', text:
            'Facturi marcate scadente: ' + data.overdue + '. Valoarea facturilor emise și plătite în ultimele 7 zile: ' +
            data.weeks.at(-1).amount + ' EUR. Verifică facturile deschise și programează următoarea revenire.' });
        if (!process.env.GEMINI_API_KEY) return offline();
        if (Date.now() - budgetStart >= 60000) { budgetStart = Date.now(); requests = 0; }
        if (requests >= 5) return offline();
        requests++;
        try {
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent', {
                method:'POST', signal:AbortSignal.timeout(12000),
                headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},
                body:JSON.stringify({contents:[{parts:[{text:'Scrie în română un briefing de maximum 3 fraze pentru manager. Compară ultima săptămână cu precedenta pe baza valorii în EUR a facturilor plătite după data emiterii. Propune o acțiune concretă. Nu inventa cauze. Date agregate: '+JSON.stringify(data)}]}],
                    generationConfig:{maxOutputTokens:600}})
            });
            if (!response.ok) return offline();
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p=>p.text).join('').trim();
            if (!text) return offline();
            return res.json({source:'gemini', text});
        } catch { return offline(); }
    } catch (err) { next(err); }
}

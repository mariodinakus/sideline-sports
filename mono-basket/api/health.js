export default function handler(req,res){
 if(req.method!=='GET'){res.status(405).json({error:'Method not allowed'});return}
 res.setHeader('Cache-Control','no-store');
 res.status(200).json({ok:true,service:'MONO BASKET',platform:'vercel',time:new Date().toISOString()});
}

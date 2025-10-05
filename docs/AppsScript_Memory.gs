// Apps Script WebApp — Memoria en Google Sheets (log + recent)
function doGet(e){return handle(e)}
function doPost(e){return handle(e)}
function handle(e){
  const op=(e.parameter.op||'').toLowerCase();
  const sheet=getSheet_();
  try{
    if(op==='log'){
      const body=JSON.parse(e.postData.contents);
      const row=[new Date(), body.sessionId, body.channel, body.who, body.text||'', body.intent||''];
      sheet.appendRow(row);
      return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
    }
    if(op==='recent'){
      const sessionId=e.parameter.sessionId; const limit=Math.min(parseInt(e.parameter.limit||'12',10),30);
      const values=sheet.getDataRange().getValues(); const out=[];
      for(let i=values.length-1;i>=1 && out.length<limit;i--){ if(values[i][1]===sessionId){ out.push({ts:values[i][0],sessionId:values[i][1],channel:values[i][2],who:values[i][3],text:values[i][4]}); } }
      out.reverse();
      return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({error:'op inválida'})).setMimeType(ContentService.MimeType.JSON);
  }catch(err){ return ContentService.createTextOutput(JSON.stringify({error:String(err)})).setMimeType(ContentService.MimeType.JSON); }
}
function getSheet_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet()||SpreadsheetApp.create('Kyaru_Memory');
  let sh=ss.getSheetByName('log_messages');
  if(!sh){ sh=ss.insertSheet('log_messages'); sh.appendRow(['ts','sessionId','channel','who','text','intent']); }
  return sh;
}

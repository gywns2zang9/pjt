const fs = require('fs');
const https = require('https');

async function test() {
  console.log("Start");
  const res = await fetch("https://openapi.koreainvestment.com:9443/oauth2/tokenP", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: "PS0vstZqi1whB2Mr9SkZ0uxaEi9ucu2rkn33",
      appsecret: "uYnQrffYmpbjnIvZGVNbQ+DrT2u2lEeV5OMyZvxCs1ogsgSEgfpoDKx3w3lZtepowxx05G67j2+nHVBk/USriYQ2s0kz5962IivVkZNULiWXdOHeKeTi40u5C+SmSHC1Hj9KR2mteTaMrMcNgwrnTuL0Udm6qAnygNkGO0okFC/6KhvTXlQ="
    }),
  });
  const data = await res.json();
  const token = data.access_token;
  console.log("Token received");
  
  const searchUrl = "https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/search-info?PDNO=삼성&PRDT_TYPE_CD=300";
  const searchRes = await fetch(searchUrl, {
    headers: {
      "authorization": "Bearer " + token,
      "appkey": "PS0vstZqi1whB2Mr9SkZ0uxaEi9ucu2rkn33",
      "appsecret": "uYnQrffYmpbjnIvZGVNbQ+DrT2u2lEeV5OMyZvxCs1ogsgSEgfpoDKx3w3lZtepowxx05G67j2+nHVBk/USriYQ2s0kz5962IivVkZNULiWXdOHeKeTi40u5C+SmSHC1Hj9KR2mteTaMrMcNgwrnTuL0Udm6qAnygNkGO0okFC/6KhvTXlQ=",
      "tr_id": "CTPF1604R", // 
    }
  });
  console.log(searchRes.status);
  console.log(await searchRes.text());
}
test().catch(console.error);

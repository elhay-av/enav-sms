const FAMILY_ID_COL = 'מזהה משפחה';
const PHONE_COL_1 = 'פלאפון אישה';
const PHONE_COL_2 = 'פלאפון בעל';
const LINK_PLACEHOLDER = '{LINK}';

const getUrlParamsFromTop = () => {
  return top.location.search.slice(1).split('&').reduce((res, i) => {
    const [key, val] = i.split('=');
    res[key] = val;
    return res;
  }, {});
};

const getLink = (link, id) => {
  return link.replace('FAMILY_ID', encodeURIComponent(id));
};

const getMessage = (link) => {
  return $('#message')[0].value.replace(LINK_PLACEHOLDER, link);
};

const getTheData = async () => {
  return $.get($('#sheet-link')[0].value).done(res => res.data);
}

const parseCsvData = (csvContent) => {
  return $.csv.toObjects(csvContent);
}

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

const testPhone = (phone) => phone && phone.length >= 9;

const getPhones = (item) => {
  const phones = [];

  if (testPhone(item[PHONE_COL_1])) {
    phones.push(item[PHONE_COL_1]);
  }

  if (testPhone(item[PHONE_COL_2])) {
    phones.push(item[PHONE_COL_2]);
  }

  return phones;
};

const sendMessages = async () => {
  const data = await getTheData();
  let parsedData = parseCsvData(data);
  const formLink = $('#form-link')[0].value;

  const messages = parsedData.map(item => {
    const link = getLink(formLink, item[FAMILY_ID_COL]);

    return {
      phones: getPhones(item),
      message: getMessage(link)
    }
  })
    .filter(item => item.phones.length);

  let success = 0;
  let failed = 0;

  messages.forEach(async (item) => {
    let res = '';
    try {
      res = await new Promise((resolve, reject) => {
        $.ajax({
          type: 'POST',
          url: 'https://cors-anywhere.herokuapp.com/https://cellactpro.net/mewsext/wssend.asmx',
          dataType: "xml",
          data: getSoapRequestXml(item.message, item.phones),
          contentType: "text/xml; charset=\"utf-8\"",
          headers: {
            SOAPAction: '"http://cellact.com/SendSMS"'
          }
        }).done(function(data) {resolve(data);}).fail(function(e) {reject(e);});
      });
      success++;
      console.log('success', res);
    } catch(e) {
      console.error('SMS failure', e);
      failed++;
    }

    $('.status').text('נשלחו: ' + success + '			נכשלו: ' + failed)
  });
}

const urlParams = getUrlParamsFromTop();

const getSoapRequestXml = (_message, phones) => {
  const response_to = $('#sms-res')[0].value;
  const message = _message.replace('&', '&amp;');

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <WSCredential xmlns="http://cellact.com/">
      <Username>${urlParams.user}</Username>
      <Password>${urlParams.pass}</Password>
      <Company>shomeinav</Company>
    </WSCredential>
  </soap:Header>
  <soap:Body>
    <SendSMS xmlns="http://cellact.com/">
      <SMS>
        <Message>${message}</Message>
        <RecipientPhones>
          ${phones.map(phone => `<string>${phone}</string>`).join('\n')}
        </RecipientPhones>
        <RateType>Default</RateType>
        <SystemRate>High</SystemRate>
        <UseDefaultCallback>false</UseDefaultCallback>
        <Callback>${response_to}</Callback>
        <UseDefaultSignature>false</UseDefaultSignature>
        <Signature>צוות צח"י</Signature>
        <IsWap>false</IsWap>
        <TTS>0</TTS>
      </SMS>
    </SendSMS>
  </soap:Body>
</soap:Envelope>`;
}
$( document ).ready(function() {
  $('.download').on('click', sendMessages);
  $('#sheet-link')[0].value = decodeURIComponent(urlParams['data-table-link']);
  $('#form-link')[0].value = decodeURIComponent(urlParams['form-link']);
  $('#sms-res')[0].value = urlParams['phone'];
  console.log( "ready!" );
});

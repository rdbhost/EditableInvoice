

$(document).ready(function() {

  currentId = null;
  defaultData = {

    items: [
       {
           "item-name": "item",
           "item-description": "Example item description",
           "item-cost": "$65.20",
           "item-qty": "2"
       }
   ],

   date: new Date().ddmmyyyy(),
   paid: "$0.00",
   header: "INVOICE",
   terms: 'NET 30 Days. Finance Charge of 1.5% will be made on unpaid balances after 30 days.',
   address: "David Keeney\nEl Paso, TX 79930\nUSA",
   id: ''
  };

  if ( isLoggedIn() ) {

    buildInvoiceList(true);
  }

  $('textarea').autosize();

  $('button.newInvoice').click(function(event){
    event.preventDefault();
    newInvoice();
  });

  $('button.deleteInvoice').click(function(event){
    event.preventDefault();
    if (window.confirm("Really delete this invoice?")) {
      deleteInvoice(currentId);
      buildInvoiceList(false);
    }
  });

  $('.invoiceList').on('click', 'a', function(event) {
    event.preventDefault();
    var id = $(this).data('id');
    loadInvoice(id);
  });



  $('#page-wrap').on('input change', 'textarea', function(event){

    var data = null;
    if($(this).closest('.item-row').length !== 0){
      data = serializeItems();
    } else {
      data = {};
      data[$(this).attr('name')] = $(this).val()
    }
    updateInvoice(currentId,data).done(function(){
      buildInvoiceList();
    })
  });

  $downloadButton = $('.download.btn');
  $emailButton = $('.email.btn');
  $signoutButton = $('.signout.btn');
  $downloadButton.click( downloadInvoice );
  $emailButton.click( sendInvoice );
  $signoutButton.click( signUserOut );
  $invoice = $('.invoiceSheet');
  $footerBar = $('.footerBar')
});

var onAddRow = function() {
  updateInvoice( currentId, serializeItems() );
};

var onDeleteRow = function() {
  updateInvoice( currentId, serializeItems() );
};

var serializeItems = function() {

  var data = {};
  data.items = [];
  $('.item-row').each(function(index){
    $('textarea', this).each(function(index){
      var datatype = $(this).attr('name');
      if(datatype !== undefined){
        if(datatype === 'item-name'){
          item = {};
        }
        item[datatype] = $(this).val();
        if(datatype === 'item-qty'){
          data.items.push(item);
        }
      }
    });
  });
  
  data.id = currentId;
  return data;
};

var buildInvoiceList = function(loadLastInvoice) {

  $('.invoiceList').empty();
  getAllInvoices().done(function(invoices){

    invoices.forEach(function(invoice){

      if(invoice.customer === ""){
        $('.invoiceList').append('<li><a href="#" data-id="'+invoice.id+'">New invoice</a></li>')
      } else {
        $('.invoiceList').append('<li><a href="#" data-id="'+invoice.id+'">'+invoice.customer+' - '+invoice.invoiceNr+'</a></li>')
      }
    });

    if(loadLastInvoice){

      var $lastInvoice = $('.invoiceList li:last-child a');
      if($lastInvoice.length !== 0){
        loadInvoice($lastInvoice.data('id'))
      } else {
        newInvoice()
      }
    }
  });
};


var newInvoice = function(){

  currentId = defaultData.id = uuid(5);
  var html = ich.invoice(defaultData);
  $('#page-wrap').empty().append(html);
  $('.item-row').each(function(){update_price(this)});
  $('textarea').autosize();
  saveInvoice();
};


var serializeCurrentInvoiceData = function() {

  var data = {};
  var item = null;
  data.items = [];
  $('textarea').each(function(index){
    var datatype = $(this).attr('name');
    if(datatype !== undefined){
      if(datatype.indexOf('item-') === -1){
        // regular data
        data[datatype] = $(this).val()
      }  else {
        // item data
        if(datatype === 'item-name'){
          item = {}
        }
        item[datatype] = $(this).val();
        if(datatype === 'item-qty'){
          data.items.push(item)
        }
      }
    }
  });
  data.id = currentId;
  return data;
};

var loadInvoice = function(id) {

  getOneInvoice(id).done(function(invoice){

    var html = ich.invoice(invoice);
    $('#page-wrap').empty().append(html);
    $('.item-row').each(function(){update_price(this)});
    $('textarea').autosize();
    currentId = invoice.id;
  });
};

var saveInvoice = function() {

  var data = serializeCurrentInvoiceData();
  updateInvoice(data.id, data)
  .done(function(data){
    buildInvoiceList();
  })
  .fail(function(data){
    console.log("Invoice not saved", data);
  })
};

var currentInvoiceToHTML = function() {

  var $result = $('#page-wrap').clone();
  $result.find('#hiderow, .notPartOfInvoice').remove();
  return $result.html().replace(/<textarea[^>]*>/g, '');
};

var currentInvoiceToText = function() {

  var text = "";
  $('#header, #address, #customer-title').each(function(index){
    text += $(this).val().trim()+"\n\n"
  });

  $('#meta tr').each(function(index){

    text += $(this).find('td:eq(0)').text()+ ": "+$(this).find('td:eq(1)').text()+ '\n'
  });
  text += '\n';

  $('.item-row').each(function(index){

    text += $(this).find('textarea:eq(0)').text()+ "\n";
    text += $(this).find('textarea:eq(1)').text()+' - ';
    text += $(this).find('textarea:eq(3)').text()+' x ';
    text += $(this).find('textarea:eq(2)').text()+'\n';
    text += 'Price: '+$(this).find('.price').text()+'\n\n';
  });

  text += 'Subtotal: '+$('#subtotal').text()+'\n';
  text += 'Total: '+$('#total').text()+'\n';
  text += 'Amount paid: '+$('#paid').val()+'\n\n';
  text += 'Balance due: '+$('.total-value .due').text()+'\n\n';
  text += 'Terms: '+$('#terms textarea').val()+'\n\n';
  return text;
};

var currentInvoiceNr = function() {

  return $.trim( $('[name=invoiceNr]').val() )
};

var currentInvoiceTitle = function() {

  return  "Invoice " + currentInvoiceNr()
};

var convertElementToDataUrl = function( el, fileName ) {

  var fileType,
      fileExtension,
      defer = $.Deferred();

  // be nice to jQuery-ists
  if (el[0]) { el = el[0]; }

  if (! fileName) {
    fileName = "invoice.png";
    fileType = "image/png";
  } else {
    fileExtension = fileName.match(/\.(.*)$/);
    if (! fileExtension) {
      defer.reject("Sorry, you need to set a supported file extension (.jpeg, .png, .pdf)!");
      return defer.promise()
    }
    fileExtension = fileExtension.pop();
    switch (fileExtension) {
      case 'jpg':
      case 'jpeg':
        fileType = "image/jpeg";
        break;

      case 'png':
        fileType = "image/png";
        break;

      // unfortunately not supported yet, that'll need some backend magic.
      // case 'pdf':
      //   fileType = "application/pdf"
      //   break;
      default:
        defer.reject("Sorry, you need to set a supported file extension (.jpeg, .png, .pdf)!")
        return defer.promise()
    }
  }

  html2canvas(el, {
    onrendered: function(canvas) {
      defer.resolve(canvas.toDataURL( fileType ), fileName, fileType)
    }
  });

  return defer.promise()
};

var downloadInvoice = function() {

  var invoiceName = $('.invoiceNr').val() || "invoice";
  var fileName = invoiceName + ".png";

  return convertElementToDataUrl( $('.invoiceSheet'), fileName )
  .then( function(dataUrl) {
    download(dataUrl, fileName)
  })
};

var download = function(uri, fileName) {

  function eventFire(el, etype){
      if (el.fireEvent) {
          (el.fireEvent('on' + etype));
      } else {
          var evObj = document.createEvent('Events');
          evObj.initEvent(etype, true, false);
          el.dispatchEvent(evObj);
      }
  }

  var link = document.createElement("a");
  link.download = fileName;
  link.href = uri;
  eventFire(link, "click");
};

 Date.prototype.ddmmyyyy = function() {

   var yyyy = this.getFullYear().toString();
   var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based
   var dd  = this.getDate().toString();
   return (dd[1]?dd:"0"+dd[0]) +'.'+ (mm[1]?mm:"0"+mm[0]) +'.'+ yyyy; // padding
  };

d = new Date();
d.ddmmyyyy();


var getInvoiceAsB64Blob = function() {

  var invoiceName = $('.invoiceNr').val() || "invoice";
  var fileName = invoiceName + ".png";

  return convertElementToDataUrl( $('.invoiceSheet'), fileName )
      .then( function(dataUrl, fName, fType) {
        var begin = dataUrl.indexOf(',');
        if ( dataUrl.substr(0,begin).indexOf('base64') < 0 ) {
          alert('invoice image not in base64: '+dataUrl.substr(0,begin));
          return '';
        }
        return dataUrl.substr(begin+1);
      })
};


var sendInvoice = function(invoice) {

  var recipient = prompt("Recipient: ");
  if (! recipient)
    return;

  var iab = getInvoiceAsB64Blob();
  iab.then( function(blob) {

    send_email({
      to: recipient,
      subject: currentInvoiceTitle(),
      html: currentInvoiceToHTML(),
      text: currentInvoiceToText(),
      attachments: [ [ 'invoice.png', blob ] ]
    })
  })
};



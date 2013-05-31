
$(document).ready(function() {

  // tell rdbhost module what role and account we are using
  //
  $.rdbHostConfig({
    'userName': "p0000001256",
    'authcode': '-',
    'domain': "www.rdbhost.com"
  });


  var getAllInvoicesSQL =  "SELECT i.stuff, i.id, i.createdBy, i.updatedOn, i.createdOn                 \n"+
                           "  FROM invoices i JOIN auth.openid_accounts o ON i.createdBy = o.identifier \n"+
                           " WHERE o.key = %(keyval) AND o.identifier = %(loginId)                        ",

      getInvoiceSQL =      "SELECT i.stuff, i.createdBy, i.updatedOn, i.createdOn                       \n"+
                           "  FROM invoices i JOIN auth.openid_accounts o ON i.createdBy = o.identifier \n"+
                           " WHERE o.key = %(keyval) AND o.identifier = %(loginId)                      \n"+
                           "   AND i.id = %(id)                                                           ",

      addInvoiceSQL =      "INSERT INTO invoices (stuff,id,createdBy)                                 \n"+
                           " SELECT %(stuff), %(id), o.identifier as createdBy                        \n"+
                           "  FROM auth.openid_accounts o                                             \n"+
                           " WHERE o.key = %(keyval) AND o.identifier = %(loginId)                      ",

      updateInvoiceSQL =   "UPDATE invoices SET stuff=%(stuff), updatedOn = %(now)                    \n"+
                           "  FROM auth.openid_accounts o                                             \n"+
                           " WHERE invoices.createdBy = o.identifier                                  \n"+
                           "   AND o.identifier = %(loginId) AND o.key = %(keyval)                    \n"+
                           "   AND invoices.id = %(id)                                                  ",

      deleteInvoiceSQL =   "DELETE FROM invoices                                                      \n"+
                           " USING auth.openid_accounts o                                             \n"+
                           " WHERE invoices.createdBy = o.identifier                                  \n"+
                           "   AND o.identifier = %(loginId) AND o.key = %(keyval)                    \n"+
                           "   AND invoices.id = %(id)                                                  ",

      sendEmailSQL =       "SELECT %(body) AS body,                                                   \n"+
                           "       %(to) AS \"To:\",                                                  \n"+
                           "       'invoice@rdbhost.com' AS \"From:\",                                \n"+
                           "       apis.postmarkkey AS apikey,                                        \n"+
                           "       'postmark' AS service,                                             \n"+
                           "       1 AS idx,                                                          \n"+
                           "       %(subject) AS \"Subject:\",                                        \n"+
                           "       %(attachname) AS \"attachmentname00\",                             \n"+
                           "       decode(%(attach),'base64')  AS \"attachmentbody00\"                \n"+
                           " FROM auth.apis LIMIT 1                                                     ";


  function uuid(len) {

    var chars, i, radix;
    if (len == null) {
      len = 7;
    }
    chars = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
    radix = chars.length;
    return ((function() {
      var _i, _results;
      _results = [];
      for (i = _i = 0; 0 <= len ? _i < len : _i > len; i = 0 <= len ? ++_i : --_i) {
        _results.push(chars[0 | Math.random() * radix]);
      }
      return _results;
    })()).join('');
  }
  window.uuid = uuid;

  function getAllInvoices() {

    return $.postData({

      'q': getAllInvoicesSQL,
      'format': 'json-easy',
      'namedParams': { 'loginId': userId, 'keyval': keyVal },

      callback: function (resp) {

        if ( resp && resp.records && resp.records.rows ) {

          return resp.records.rows.map( function(i) {
              var j = JSON.parse(i.stuff);
              j['createdBy'] = i.createdBy;
              j['createdOn'] = i.createdOn;
              j['updatedOn'] = i.updatedOn;
              return j;
          });
        }
        else {

          return [];
        }
      }
    });
  }
  window.getAllInvoices = getAllInvoices;


  function getOneInvoice(id) {

    return $.postData({

      'q': getInvoiceSQL,
      'format': 'json-easy',
      'namedParams': { 'loginId': userId, 'keyval': keyVal, 'id': id },

      callback: function (resp) {

        if ( resp && resp.records && resp.records.rows ) {

          var i = resp.records.rows[0];
          var j = JSON.parse(i.stuff);
          j['createdBy'] = i.createdBy;
          j['createdOn'] = i.createdOn;
          j['updatedOn'] = i.updatedOn;
          return j;
        }
        else {

          return null;
        }
      }
    });
  }
  window.getOneInvoice = getOneInvoice;


  function updateInvoice(id, properties) {

    var today = new Date(),
       jsonStr = JSON.stringify(properties);

    function addInvoice() {

      return $.postData({

        'q': addInvoiceSQL,

        'namedParams': {
          'loginId': userId,
          'keyval': keyVal,
          'id': id,
          'stuff': jsonStr
        },

        callback: function(resp) { return resp; }

      });
    }

    return $.postData({

      'q': updateInvoiceSQL,
      'format': 'json-easy',

      'namedParams': {
        'loginId': userId,
        'keyval': keyVal,
        'id': id,
        'stuff': jsonStr,
        'now': today.toISOString()
      },

      callback: function (resp) {

        if ( resp && resp.row_count && resp.row_count[0] > 0 ) {

          return resp.row_count;
        }
        else {

          return addInvoice();
        }
      }

    });
  }
  window.updateInvoice = updateInvoice;


  function deleteInvoice(id) {

    return $.postData({

      'q': deleteInvoiceSQL,
      'format': 'json-easy',

      'namedParams': {
        'loginId': userId,
        'keyval': keyVal,
        'id': id
      },

      callback: function (resp) {

        if ( resp && resp.row_count && resp.row_count[0] > 0 ) {

          return resp.row_count;
        }
        else {

          return false;
        }
      }

    });
  }
  window.deleteInvoice = deleteInvoice;


  var myKeyName = 'invoice-rdbhost',
      loginKeyName = 'LOGIN_KEY', // fixed by rdbhost
      keyVal, userId;

  window.isLoggedIn = function() {

    return !!userId;
  };

  // login - runs when page loads
  //
  function login() {

    var ck = $.cookie(myKeyName);
    if ( ck ) {

      var ckParts = ck.split(' ');
      userId = ckParts[0];
      keyVal = ckParts[1];
      renderUserSignedIn(userId);
      window.console.log('logged in as '+userId);
    }
    else {
      var lmodal = $('#loginModal');
      lmodal.modal({'backdrop':'static'});
      lmodal.modal('show');
      renderUserSignedOut();
      window.console.log('not logged in');
    }
  }

  function renderUserSignedIn(username) {

    $('.username').text(username);
    $('.account-signedin').show();
    $('.account-signedout').hide();
  }

  function renderUserSignedOut() {

    $('.username').text('');
    $('.account-signedout').show();
    $('.account-signedin').hide();
  }

  function signUserOut() {

    renderUserSignedOut();
    userId = null;
    $.cookie(myKeyName, '', {expires: -1, path: '/'});
    $.cookie(loginKeyName, '', {path: '/', expires: -1});

    var lmodal = $('#loginModal');
    lmodal.modal({'backdrop':'static'});
    lmodal.modal('show');

  }
  window.signUserOut = signUserOut;


  // set up openId login form
  //
  $.loginOpenId({

    'loginForm' : 'openidForm',
    'errback' : function () {},
    'callback' : function(key, ident) {

      userId = ident;
      var key = $.cookie(loginKeyName);
      $.cookie(myKeyName, ident+' '+key, {path:'/'});
      $.cookie(loginKeyName, '', {path: '/', expires: -1});
      login();
    }
  });

  // login user in, load sidebar
  //
  login();

  // function to send email
  //
  function send_email(opts) {

    return $.postData({

      'q': sendEmailSQL,
      'format': 'json-easy',
      'mode': 'email',

      'namedParams': {
        'body': opts.text,
        'subject': opts.subject,
        'to': opts.to,
        'attach': opts.attachments[0][1],
        'attachname': opts.attachments[0][0]
      },

      callback: function (resp) {

        var httpStat = resp.status[0];

        if (httpStat === 'error') {

          alert('<div>Email was not Sent %s</div>'.replace('%s',resp.error[1]));
        }
        else {

          var stat = resp.records.rows[0].result;
          if (stat != 'Success') {
            alert('<div>Error: %s</div>'.replace('%s',stat));
          }
        }
      },

      errback: function (code, msg) {

        alert('error '+code+' '+msg);
      }
    })
  }
  window.send_email = send_email;

});


//;

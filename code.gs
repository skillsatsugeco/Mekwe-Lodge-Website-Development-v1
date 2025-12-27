function doGet(e) {
  const action = e.parameter.action;
  
  if (action == 'getRooms') {
    return getRooms();
  } else if (action == 'getServices') {
    return getServices();
  } else if (action == 'getBookings') {
    return getBookings();
  } else if (action == 'getSettings') {
    return getSettings();
  }
  
  return ContentService.createTextOutput(JSON.stringify({error: 'Invalid Action'})).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;
  
  if (action == 'bookRoom') {
    return bookRoom(params.data);
  } else if (action == 'updateBookingStatus') {
    return updateBookingStatus(params.data);
  } else if (action == 'saveSettings') {
    return saveSettings(params.data);
  } else if (action == 'login') {
      return login(params.data);
  }
  
  return ContentService.createTextOutput(JSON.stringify({error: 'Invalid Action'})).setMimeType(ContentService.MimeType.JSON);
}

// --- Data Access Methods ---
// Expects Sheet with tabs: "Rooms", "Services", "Bookings", "Admin"

function getRooms() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rooms');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const rooms = data.map(row => {
    let room = {};
    headers.forEach((h, i) => room[h] = row[i]);
    return room;
  });
  return createJSONOutput(rooms);
}

function getServices() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Services');
  // If Services sheet doesn't exist, return empty
  if (!sheet) return createJSONOutput([]);
  
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const services = data.map(row => {
    let service = {};
    headers.forEach((h, i) => service[h] = row[i]);
    return service;
  });
  return createJSONOutput(services);
}

function getBookings() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Bookings');
  if (!sheet) return createJSONOutput([]);

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const bookings = data.map((row, index) => {
    let booking = {};
    headers.forEach((h, i) => booking[h] = row[i]);
    booking['rowIndex'] = index + 2; // Store row index for updates (1-based, + header)
    return booking;
  });
  return createJSONOutput(bookings.reverse()); // Newest first
}

function bookRoom(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Bookings');
  // Headers: BookingID, CustomerName, Phone, RoomType, CheckIn, CheckOut, TransactionID, Status, Timestamp
  
  const bookingId = Utilities.getUuid();
  const timestamp = new Date();
  
  sheet.appendRow([
    bookingId,
    data.customerName,
    data.phone,
    data.roomType,
    data.checkIn,
    data.checkOut,
    data.transactionId,
    'Pending', // Default status
    timestamp
  ]);
  
  return createJSONOutput({status: 'success', message: 'Booking received. Waiting for confirmation.', bookingId: bookingId});
}

function updateBookingStatus(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Bookings');
  // data needs {rowIndex: 5, status: 'Confirmed'}
  // Security Note: In a real app we'd verify admin token, but for now we rely on the hidden admin panel.
  
  if (data.rowIndex && data.status) {
      // Column H is Status (8th column)
      sheet.getRange(data.rowIndex, 8).setValue(data.status);
      return createJSONOutput({status: 'success', message: 'Status updated'});
  }
  return createJSONOutput({status: 'error', message: 'Missing RowIndex or Status'});
}

function login(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Admin');
  // Simple check against first row: User, Pass
  if (!sheet) return createJSONOutput({status: 'error', message: 'No Admin Configured'});
  
  const adminData = sheet.getRange(2, 1, 1, 2).getValues()[0];
  if (data.username === adminData[0] && data.password === adminData[1]) {
     return createJSONOutput({status: 'success', token: 'mock-token'}); 
  }
  return createJSONOutput({status: 'error', message: 'Invalid Credentials'});
}

function getSettings() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  if (!sheet) return createJSONOutput({});
  
  const data = sheet.getDataRange().getValues();
  // key, value
  let settings = {};
  // Skip header if exists, or just read all. Let's assume Row 1 is header "Key", "Value"
  for (let i = 1; i < data.length; i++) {
    settings[data[i][0]] = data[i][1];
  }
  return createJSONOutput(settings);
}

function saveSettings(data) {
   const ss = SpreadsheetApp.getActiveSpreadsheet();
   let sheet = ss.getSheetByName('Settings');
   if (!sheet) {
     sheet = ss.insertSheet('Settings');
     sheet.appendRow(['Key', 'Value']);
   }
   
   // simplistic: clear and rewrite or upsert?
   // Let's upsert.
   const existingData = sheet.getDataRange().getValues();
   // Create map of existing keys to row indices
   let keyMap = {};
   for (let i = 1; i < existingData.length; i++) {
     keyMap[existingData[i][0]] = i + 1; // 1-based row index
   }
   
   // Loop through incoming data keys
   for (const key in data) {
     if (keyMap[key]) {
       // Update
       sheet.getRange(keyMap[key], 2).setValue(data[key]);
     } else {
       // Insert
       sheet.appendRow([key, data[key]]);
     }
   }
   
   return createJSONOutput({status: 'success', message: 'Settings Saved'});
}


function createJSONOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function setup() {
    // Run this once to create sheets
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss.getSheetByName('Rooms')) {
        const s = ss.insertSheet('Rooms');
        s.appendRow(['RoomNumber', 'Type', 'Price', 'Status', 'Description', 'ImageURL']);
    }
    if (!ss.getSheetByName('Services')) {
        const s = ss.insertSheet('Services');
        s.appendRow(['Name', 'Price', 'Description', 'ImageURL']);
    }
    if (!ss.getSheetByName('Bookings')) {
        const s = ss.insertSheet('Bookings');
        s.appendRow(['BookingID', 'CustomerName', 'Phone', 'RoomType', 'CheckIn', 'CheckOut', 'TransactionID', 'Status', 'Timestamp']);
    }
     if (!ss.getSheetByName('Admin')) {
        const s = ss.insertSheet('Admin');
        s.appendRow(['Username', 'Password']);
        s.appendRow(['admin', 'admin123']); // Default credentials
    }
    if (!ss.getSheetByName('Settings')) {
        const s = ss.insertSheet('Settings');
        s.appendRow(['Key', 'Value']);
        s.appendRow(['hero_image', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80']);
    }
}

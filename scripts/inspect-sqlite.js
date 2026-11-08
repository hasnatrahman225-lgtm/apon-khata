const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(__dirname, '..', 'backend', 'data', 'khatabook.sqlite'));

console.log('--- USERS ---');
const users = db.prepare('SELECT * FROM users').all();
console.log(users);

console.log('--- CONTACTS ---');
const contacts = db.prepare('SELECT * FROM contacts').all();
console.log(contacts);

console.log('--- TRANSACTIONS COUNT ---');
const txs = db.prepare('SELECT * FROM transactions').all();
console.log('Total txs:', txs.length);
if (txs.length > 0) {
  console.log('First Tx:', txs[0]);
  console.log('Last Tx:', txs[txs.length - 1]);
}

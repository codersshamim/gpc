const readline = require('readline');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function askHidden(prompt) {
  return new Promise(resolve => {
    process.stdout.write(prompt);
    const stdin = process.stdin; stdin.setRawMode?.(true); stdin.resume(); let value='';
    const onData = ch => { ch=ch.toString(); if(ch==='\r'||ch==='\n'){stdin.setRawMode?.(false);stdin.pause();stdin.removeListener('data',onData);process.stdout.write('\n');resolve(value);} else if(ch==='\u0003'){process.exit();} else if(ch==='\u007f'){value=value.slice(0,-1);} else value+=ch; };
    stdin.on('data',onData);
  });
}
(async()=>{
  const username=await new Promise(resolve=>rl.question('Admin username [admin]: ',a=>resolve(a.trim()||'admin')));
  rl.close();
  const password=await askHidden('Create admin password (input hidden): ');
  if(password.length<12){console.error('Use at least 12 characters. Run this script again.');process.exit(1);}
  const hash=await bcrypt.hash(password,12);
  console.log('\nAdd these lines to your .env file:');
  console.log(`ADMIN_USERNAME=${username}`);
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log(`SESSION_SECRET=${crypto.randomBytes(48).toString('hex')}`);
  console.log('\nKeep .env private. Do not upload it to GitHub or share it.');
})();

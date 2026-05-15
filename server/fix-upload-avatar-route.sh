#!/bin/bash

set -e

node <<'NODE'
const fs = require('fs');

const file = 'src/routes/authRoute.js';

let text = fs.readFileSync(file, 'utf8');

text = text.replace(
  "uploadAvatar.single('avatar')",
  "uploadAvatar",
);

text = text.replace(
  'uploadAvatar.single("avatar")',
  'uploadAvatar',
);

fs.writeFileSync(file, text);

console.log('FIXED src/routes/authRoute.js');
NODE

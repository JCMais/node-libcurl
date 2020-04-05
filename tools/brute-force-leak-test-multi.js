/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Multi = require('../lib/Multi'),
  amount = process.argv[2] | 0 || 1e2,
  iterations = 5,
  i

function leak() {
  for (i = 0; i < amount; i++) {
    new Multi()
  }

  if (global.gc) {
    global.gc()
  }

  if (--iterations) {
    //setTimeout( leak, timeout );
    leak()
  }
}

leak()

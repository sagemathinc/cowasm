# vim:fileencoding=utf-8
# License: BSD Copyright: 2016, Kovid Goyal <kovid at kovidgoyal.net>

from aes import CBC, CTR, GCM, generate_tag, as_hex, AES, string_to_bytes, random_bytes

def from_hex(text):
    text = str.replace(text, ' ', '')
    ans = Uint8Array(text.length // 2)
    for i in range(ans.length):
        ans[i] = int(text[2*i:2*i+2], 16)
    return ans

def from32(ints):
    ans = Uint8Array(ints.length * 4)
    for i, num in enumerate(ints):
        off = i*4
        ans[off] = (num & 0xff000000) >> 24
        ans[off+1] = (num & 0x00ff0000) >> 16
        ans[off+2] = (num & 0x0000ff00) >> 8
        ans[off+3] = num & 0x000000ff
    return ans

def rungcm(keys, ivs, inputs, adatas, outputs, tags):
    for i in range(keys.length):
        iv = from_hex(ivs[i])
        gcm = GCM(from_hex(keys[i]))
        inputbytes = from_hex(inputs[i])
        outputbytes = from_hex(outputs[i])
        adata = from_hex(adatas[i])
        ans = gcm._crypt(iv, inputbytes, adata, False)
        assrt.equal(as_hex(ans.cipherbytes), outputs[i])
        assrt.equal(as_hex(ans.tag), tags[i])
        ans = gcm._crypt(iv, outputbytes, adata, True)
        assrt.equal(as_hex(ans.cipherbytes), inputs[i])
        assrt.equal(as_hex(ans.tag), tags[i])

def run_tests():
    # Test basic AES {{{
    k1 = '000102030405060708090a0b0c0d0e0f'
    k2 = k1 + '1011121314151617'
    k3 = k2 + '18191a1b1c1d1e1f'
    b = [0x00112233, 0x44556677, 0x8899aabb, 0xccddeeff]

    for data in [
        (b, k1, '69c4e0d86a7b0430d8cdb78070b4c55a', False),
        ([0x69c4e0d8, 0x6a7b0430, 0xd8cdb780, 0x70b4c55a], k1, '00112233445566778899aabbccddeeff', True),
        (b, k2, 'dda97ca4864cdfe06eaf70a0ec0d7191', False),
        ([0xdda97ca4, 0x864cdfe0, 0x6eaf70a0, 0xec0d7191], k2, '00112233445566778899aabbccddeeff', True),
        (b, k3, '8ea2b7ca516745bfeafc49904b496089', False),
        ([0x8ea2b7ca, 0x516745bf, 0xeafc4990, 0x4b496089], k3, '00112233445566778899aabbccddeeff', True),
    ]:
        block, key, expected, decrypt = data
        aes = AES(from_hex(key))
        output = Uint8Array(block.length * 4)
        aes.decrypt32(block, output, 0) if decrypt else aes.encrypt32(block, output, 0)
        assrt.equal(expected, as_hex(output))

    # Test AES-CBC
    keys = [
         '06a9214036b8a15b512e03d534120006',
         'c286696d887c9aa0611bbb3e2025a45a',
         '6c3ea0477630ce21a2ce334aa746c2cd',
         '56e47a38c5598974bc46903dba290349'
      ]

    ivs = [
         '3dafba429d9eb430b422da802c9fac41',
         '562e17996d093d28ddb3ba695a2e6f58',
         'c782dc4c098c66cbd9cd27d825682c81',
         '8ce82eefbea0da3c44699ed7db51b7d9'
      ]

    inputs = [
        'Single block msg',
        '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
        'This is a 48-byte message (exactly 3 AES blocks)',
        'a0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedf'
    ]

    outputs = [
        'e353779c1079aeb82708942dbe77181a',
        'd296cd94c2cccf8a3a863028b5e1dc0a7586602d253cfff91b8266bea6d61ab1',
        'd0a02b3836451753d493665d33f0e8862dea54cdb293abc7506939276772f8d5021c19216bad525c8579695d83ba2684',
        'c30e32ffedc0774e6aff6af0869f71aa0f3af07a9a31a9c684db207eb0ef8e4e35907aa632c3ffdf868bb7b29d3d46ad83ce9f9a102ee99d49a53e87f4c3da55'
    ]
    for i in range(keys.length):
        cbc = CBC(from_hex(keys[i]))
        x = inputs[i]
        inputbytes = string_to_bytes(x) if ' ' in x else from_hex(x)
        x = outputs[i]
        outputbytes = string_to_bytes(x) if ' ' in x else from_hex(x)
        iv = from_hex(ivs[i])
        ans = cbc.encrypt_bytes(inputbytes, [], iv)
        assrt.equal(as_hex(ans.cipherbytes), outputs[i])
        ans = cbc.decrypt_bytes(outputbytes, [], iv)
        assrt.equal(as_hex(ans), as_hex(inputbytes))
    # }}}

    # Test AES-CTR {{{
    keys = [
         '00000000000000000000000000000000',
         '2b7e151628aed2a6abf7158809cf4f3c'
    ]

    ivs = [
         '650cdb80ff9fc758342d2bd99ee2abcf',
         'f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff'
    ]

    inputs = [
         'This is a 48-byte message (exactly 3 AES blocks)',
         '6bc1bee22e409f96e93d7e117393172a' 'ae2d8a571e03ac9c9eb76fac45af8e51' '30c81c46a35ce411e5fbc1191a0a52ef' 'f69f2445df4f9b17ad2b417be66c3710'
    ]

    outputs = [
         '5ede11d00e9a76ec1d5e7e811ea3dd1c' 'e09ee941210f825d35718d3282796f1c' '07c3f1cb424f2b365766ab5229f5b5a4',
         '874d6191b620e3261bef6864990db6ce' '9806f66b7970fdff8617187bb9fffdff' '5ae4df3edbd5d35e5b4f09020db03eab' '1e031dda2fbe03d1792170a0f3009cee'
    ]

    for i in range(keys.length):
        iv = from_hex(ivs[i])
        ctr = CTR(from_hex(keys[i]), iv)
        x = inputs[i]
        inputbytes = string_to_bytes(x) if ' ' in x else from_hex(x)
        x = outputs[i]
        outputbytes = string_to_bytes(x) if ' ' in x else from_hex(x)
        temp = Uint8Array(inputbytes)
        ctr._crypt(temp)
        assrt.equal(as_hex(temp), outputs[i])
    # }}}

    # Test AES-GCM {{{
    keys = [
        '00000000000000000000000000000000',
        '00000000000000000000000000000000',
        'feffe9928665731c6d6a8f9467308308',
        'feffe9928665731c6d6a8f9467308308',
        'feffe9928665731c6d6a8f9467308308',
        'feffe9928665731c6d6a8f9467308308',
        '00000000000000000000000000000000'
      ]

    ivs = [
        '000000000000000000000000',
        '000000000000000000000000',
        'cafebabefacedbaddecaf888',
        'cafebabefacedbaddecaf888',
        'cafebabefacedbad',
        '9313225df88406e555909c5aff5269aa' + '6a7a9538534f7da1e4c303d2a318a728' + 'c3c0c95156809539fcf0e2429a6b5254' + '16aedbf5a0de6a57a637b39b',
        '000000000000000000000000'
      ]

    adatas = [
        '',
        '',
        '',
        'feedfacedeadbeeffeedfacedeadbeef' + 'abaddad2',
        'feedfacedeadbeeffeedfacedeadbeef' + 'abaddad2',
        'feedfacedeadbeeffeedfacedeadbeef' + 'abaddad2',
        ''
      ]

    inputs = [
        '',
        '00000000000000000000000000000000',
        'd9313225f88406e5a55909c5aff5269a' + '86a7a9531534f7da2e4c303d8a318a72' + '1c3c0c95956809532fcf0e2449a6b525' + 'b16aedf5aa0de657ba637b391aafd255',
        'd9313225f88406e5a55909c5aff5269a' + '86a7a9531534f7da2e4c303d8a318a72' + '1c3c0c95956809532fcf0e2449a6b525' + 'b16aedf5aa0de657ba637b39',
        'd9313225f88406e5a55909c5aff5269a' + '86a7a9531534f7da2e4c303d8a318a72' + '1c3c0c95956809532fcf0e2449a6b525' + 'b16aedf5aa0de657ba637b39',
        'd9313225f88406e5a55909c5aff5269a' + '86a7a9531534f7da2e4c303d8a318a72' + '1c3c0c95956809532fcf0e2449a6b525' + 'b16aedf5aa0de657ba637b39',
        '0000'
      ]

    outputs = [
        '',
        '0388dace60b6a392f328c2b971b2fe78',
        '42831ec2217774244b7221b784d0d49c' + 'e3aa212f2c02a4e035c17e2329aca12e' + '21d514b25466931c7d8f6a5aac84aa05' + '1ba30b396a0aac973d58e091473f5985',
        '42831ec2217774244b7221b784d0d49c' + 'e3aa212f2c02a4e035c17e2329aca12e' + '21d514b25466931c7d8f6a5aac84aa05' + '1ba30b396a0aac973d58e091',
        '61353b4c2806934a777ff51fa22a4755' + '699b2a714fcdc6f83766e5f97b6c7423' + '73806900e49f24b22b097544d4896b42' + '4989b5e1ebac0f07c23f4598',
        '8ce24998625615b603a033aca13fb894' + 'be9112a5c3a211a8ba262a3cca7e2ca7' + '01e4a9a4fba43c90ccdcb281d48c7c6f' + 'd62875d2aca417034c34aee5',
        '0388'
      ]

    tags = [
        '58e2fccefa7e3061367f1d57a4e7455a',
        'ab6e47d42cec13bdf53a67b21257bddf',
        '4d5c2af327cd64a62cf35abd2ba6fab4',
        '5bc94fbc3221a5db94fae95ae7121a47',
        '3612d2e79e3b0785561be14aaca2fccb',
        '619cc5aefffe0bfa462af43c1699d050',
        '93dcdd26f79ec1dd9bff57204d9b33f5'
    ]
    rungcm(keys, ivs, inputs, adatas, outputs, tags)

    keys = [
        '00000000000000000000000000000000' +
          '0000000000000000',
        '00000000000000000000000000000000' +
          '0000000000000000',
        'feffe9928665731c6d6a8f9467308308' +
          'feffe9928665731c',
        'feffe9928665731c6d6a8f9467308308' +
          'feffe9928665731c',
        'feffe9928665731c6d6a8f9467308308' +
          'feffe9928665731c',
        'feffe9928665731c6d6a8f9467308308' +
          'feffe9928665731c'
    ]

    ivs = [
        '000000000000000000000000',
        '000000000000000000000000',
        'cafebabefacedbaddecaf888',
        'cafebabefacedbaddecaf888',
        'cafebabefacedbad',
        '9313225df88406e555909c5aff5269aa' +
          '6a7a9538534f7da1e4c303d2a318a728' +
          'c3c0c95156809539fcf0e2429a6b5254' +
          '16aedbf5a0de6a57a637b39b'
    ]

    adatas = [
        '',
        '',
        '',
        'feedfacedeadbeeffeedfacedeadbeef' +
          'abaddad2',
        'feedfacedeadbeeffeedfacedeadbeef' +
          'abaddad2',
        'feedfacedeadbeeffeedfacedeadbeef' +
          'abaddad2'
    ]

    inputs = [
        '',
        '00000000000000000000000000000000',
        'd9313225f88406e5a55909c5aff5269a' +
          '86a7a9531534f7da2e4c303d8a318a72' +
          '1c3c0c95956809532fcf0e2449a6b525' +
          'b16aedf5aa0de657ba637b391aafd255',
        'd9313225f88406e5a55909c5aff5269a' +
          '86a7a9531534f7da2e4c303d8a318a72' +
          '1c3c0c95956809532fcf0e2449a6b525' +
          'b16aedf5aa0de657ba637b39',
        'd9313225f88406e5a55909c5aff5269a' +
          '86a7a9531534f7da2e4c303d8a318a72' +
          '1c3c0c95956809532fcf0e2449a6b525' +
          'b16aedf5aa0de657ba637b39',
        'd9313225f88406e5a55909c5aff5269a' +
          '86a7a9531534f7da2e4c303d8a318a72' +
          '1c3c0c95956809532fcf0e2449a6b525' +
          'b16aedf5aa0de657ba637b39'
    ]

    outputs = [
        '',
        '98e7247c07f0fe411c267e4384b0f600',
        '3980ca0b3c00e841eb06fac4872a2757' +
          '859e1ceaa6efd984628593b40ca1e19c' +
          '7d773d00c144c525ac619d18c84a3f47' +
          '18e2448b2fe324d9ccda2710acade256',
        '3980ca0b3c00e841eb06fac4872a2757' +
          '859e1ceaa6efd984628593b40ca1e19c' +
          '7d773d00c144c525ac619d18c84a3f47' +
          '18e2448b2fe324d9ccda2710',
        '0f10f599ae14a154ed24b36e25324db8' +
          'c566632ef2bbb34f8347280fc4507057' +
          'fddc29df9a471f75c66541d4d4dad1c9' +
          'e93a19a58e8b473fa0f062f7',
        'd27e88681ce3243c4830165a8fdcf9ff' +
          '1de9a1d8e6b447ef6ef7b79828666e45' +
          '81e79012af34ddd9e2f037589b292db3' +
          'e67c036745fa22e7e9b7373b'
    ]

    tags = [
        'cd33b28ac773f74ba00ed1f312572435',
        '2ff58d80033927ab8ef4d4587514f0fb',
        '9924a7c8587336bfb118024db8674a14',
        '2519498e80f1478f37ba55bd6d27618c',
        '65dcc57fcf623a24094fcca40d3533f8',
        'dcf566ff291c25bbb8568fc3d376a6d9'
    ]
    rungcm(keys, ivs, inputs, adatas, outputs, tags)

    keys = [
        '00000000000000000000000000000000' +
          '00000000000000000000000000000000',
        '00000000000000000000000000000000' +
          '00000000000000000000000000000000',
        'feffe9928665731c6d6a8f9467308308' +
          'feffe9928665731c6d6a8f9467308308',
        'feffe9928665731c6d6a8f9467308308' +
          'feffe9928665731c6d6a8f9467308308',
        'feffe9928665731c6d6a8f9467308308' +
          'feffe9928665731c6d6a8f9467308308',
        'feffe9928665731c6d6a8f9467308308' +
          'feffe9928665731c6d6a8f9467308308'
    ]

    ivs = [
        '000000000000000000000000',
        '000000000000000000000000',
        'cafebabefacedbaddecaf888',
        'cafebabefacedbaddecaf888',
        'cafebabefacedbad',
        '9313225df88406e555909c5aff5269aa' +
          '6a7a9538534f7da1e4c303d2a318a728' +
          'c3c0c95156809539fcf0e2429a6b5254' +
          '16aedbf5a0de6a57a637b39b'
    ]

    adatas = [
        '',
        '',
        '',
        'feedfacedeadbeeffeedfacedeadbeef' +
          'abaddad2',
        'feedfacedeadbeeffeedfacedeadbeef' +
          'abaddad2',
        'feedfacedeadbeeffeedfacedeadbeef' +
          'abaddad2'
    ]

    inputs = [
        '',
        '00000000000000000000000000000000',
        'd9313225f88406e5a55909c5aff5269a' +
          '86a7a9531534f7da2e4c303d8a318a72' +
          '1c3c0c95956809532fcf0e2449a6b525' +
          'b16aedf5aa0de657ba637b391aafd255',
        'd9313225f88406e5a55909c5aff5269a' +
          '86a7a9531534f7da2e4c303d8a318a72' +
          '1c3c0c95956809532fcf0e2449a6b525' +
          'b16aedf5aa0de657ba637b39',
        'd9313225f88406e5a55909c5aff5269a' +
          '86a7a9531534f7da2e4c303d8a318a72' +
          '1c3c0c95956809532fcf0e2449a6b525' +
          'b16aedf5aa0de657ba637b39',
        'd9313225f88406e5a55909c5aff5269a' +
          '86a7a9531534f7da2e4c303d8a318a72' +
          '1c3c0c95956809532fcf0e2449a6b525' +
          'b16aedf5aa0de657ba637b39'
    ]

    outputs = [
        '',
        'cea7403d4d606b6e074ec5d3baf39d18',
        '522dc1f099567d07f47f37a32a84427d' +
          '643a8cdcbfe5c0c97598a2bd2555d1aa' +
          '8cb08e48590dbb3da7b08b1056828838' +
          'c5f61e6393ba7a0abcc9f662898015ad',
        '522dc1f099567d07f47f37a32a84427d' +
          '643a8cdcbfe5c0c97598a2bd2555d1aa' +
          '8cb08e48590dbb3da7b08b1056828838' +
          'c5f61e6393ba7a0abcc9f662',
        'c3762df1ca787d32ae47c13bf19844cb' +
          'af1ae14d0b976afac52ff7d79bba9de0' +
          'feb582d33934a4f0954cc2363bc73f78' +
          '62ac430e64abe499f47c9b1f',
        '5a8def2f0c9e53f1f75d7853659e2a20' +
          'eeb2b22aafde6419a058ab4f6f746bf4' +
          '0fc0c3b780f244452da3ebf1c5d82cde' +
          'a2418997200ef82e44ae7e3f'
    ]

    tags = [
        '530f8afbc74536b9a963b4f1c4cb738b',
        'd0d1c8a799996bf0265b98b5d48ab919',
        'b094dac5d93471bdec1a502270e3cc6c',
        '76fc6ece0f4e1768cddf8853bb2d551b',
        '3a337dbf46a792c45e454913fe2ea8f2',
        'a44a8266ee1c8eb0c8b5d4cf5ae9f19a'
    ]
    rungcm(keys, ivs, inputs, adatas, outputs, tags)

    # Test that IVs do not repeat (they are incrementing)
    gcm = GCM(random_bytes(16))
    for i in range(5):
        iv = gcm.encrypt(str(i)).iv
        assrt.equal(iv[11], i+1)
        for j in range(10):
            assrt.equal(iv[j], 0)
    # Test that iv rollover is not allowed
    gcm.current_iv.fill(255)
    assrt.throws(def(): gcm.encrypt('iv over');)

    # }}}

    # Test roundtripping {{{

    text = 'testing a basic roundtrip ø̄ū'

    cbc = CBC()
    crypted = cbc.encrypt(text)
    decrypted = cbc.decrypt(crypted)
    assrt.equal(text, decrypted)
    secret_tag = generate_tag()
    crypted = cbc.encrypt(text, secret_tag)
    decrypted = cbc.decrypt(crypted, secret_tag)
    assrt.equal(text, decrypted)

    ctr = CTR()
    crypted = ctr.encrypt(text)
    decrypted = ctr.decrypt(crypted)
    assrt.equal(text, decrypted)
    crypted = ctr.encrypt(text, secret_tag)
    decrypted = ctr.decrypt(crypted, secret_tag)
    assrt.equal(text, decrypted)

    gcm = GCM()
    crypted = gcm.encrypt(text)
    decrypted = gcm.decrypt(crypted)
    assrt.equal(text, decrypted)
    crypted = gcm.encrypt(text, secret_tag)
    decrypted = gcm.decrypt(crypted, secret_tag)
    assrt.equal(text, decrypted)

    assrt.ok(equals(from_hex('69c4e0d86a7b0430d8cdb78070b4c55a'), from32([0x69c4e0d8, 0x6a7b0430, 0xd8cdb780, 0x70b4c55a])))
    # }}}

run_tests()

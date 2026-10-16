"""Losslessly recompress PNG scanlines without decoding or changing pixels."""
import struct
import zlib

def compress_png(data):
    if data[:8] != b'\x89PNG\r\n\x1a\n':raise ValueError('Not PNG')
    chunks=[];pos=8
    while pos<len(data):
        size=struct.unpack('>I',data[pos:pos+4])[0];end=pos+size+12
        if end>len(data):raise ValueError('Truncated PNG')
        kind=data[pos+4:pos+8];payload=data[pos+8:end-4]
        if zlib.crc32(kind+payload)!=struct.unpack('>I',data[end-4:end])[0]:raise ValueError('PNG checksum mismatch')
        chunks.append((kind,payload,data[pos:end]));pos=end
    raw=zlib.decompress(b''.join(p for k,p,_ in chunks if k==b'IDAT'))
    packed=zlib.compress(raw,9)
    assert zlib.decompress(packed)==raw
    output=[data[:8]];written=False
    for kind,payload,original in chunks:
        if kind!=b'IDAT':output.append(original);continue
        if not written:
            output.append(struct.pack('>I',len(packed))+b'IDAT'+packed+struct.pack('>I',zlib.crc32(b'IDAT'+packed)));written=True
    result=b''.join(output)
    return result if len(result)<len(data) else data

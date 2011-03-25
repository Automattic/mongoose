var sys = require('sys');

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/classes/binary-parser [v1.0]
var chr = String.fromCharCode;
var maxBits = [];
for(var i = 0; i<64; i++)
	maxBits[i] = Math.pow(2, i);

var p = exports.BinaryParser = function( bigEndian, allowExceptions ){
	this.bigEndian = bigEndian;
	this.allowExceptions = allowExceptions;
};

var Buffer = exports.BinaryParser.Buffer = function( bigEndian, buffer ){
  this.bigEndian = bigEndian || 0;
  this.buffer = [];
  this.setBuffer( buffer );
};

Buffer.prototype.setBuffer = function( data ){
	if( data ){
		for( var l, i = l = data.length, b = this.buffer = new Array( l ); i; b[l - i] = data.charCodeAt( --i ) );
		this.bigEndian && b.reverse();
	}
};

Buffer.prototype.hasNeededBits = function( neededBits ){
	return this.buffer.length >= -( -neededBits >> 3 );
};

Buffer.prototype.checkBuffer = function( neededBits ){
	if( !this.hasNeededBits( neededBits ) )
		throw new Error( "checkBuffer::missing bytes" );
};

Buffer.prototype.readBits = function( start, length ){
	//shl fix: Henri Torgemane ~1996 (compressed by Jonas Raoni)
	function shl( a, b ){
		for( ; b--; a = ( ( a %= 0x7fffffff + 1 ) & 0x40000000 ) == 0x40000000 ? a * 2 : ( a - 0x40000000 ) * 2 + 0x7fffffff + 1 );
		return a;
	}
	if( start < 0 || length <= 0 )
		return 0;
	this.checkBuffer( start + length );
	for( var offsetLeft, offsetRight = start % 8, curByte = this.buffer.length - ( start >> 3 ) - 1, lastByte = this.buffer.length + ( -( start + length ) >> 3 ), diff = curByte - lastByte, sum = ( ( this.buffer[ curByte ] >> offsetRight ) & ( ( 1 << ( diff ? 8 - offsetRight : length ) ) - 1 ) ) + ( diff && ( offsetLeft = ( start + length ) % 8 ) ? ( this.buffer[ lastByte++ ] & ( ( 1 << offsetLeft ) - 1 ) ) << ( diff-- << 3 ) - offsetRight : 0 ); diff; sum += shl( this.buffer[ lastByte++ ], ( diff-- << 3 ) - offsetRight ) );
	return sum;
};
	
p.warn = function( msg ){
	if( this.allowExceptions )
		throw new Error( msg );
	return 1;
};
p.decodeFloat = function( data, precisionBits, exponentBits ){
	var b = new this.Buffer( this.bigEndian, data );
	b.checkBuffer( precisionBits + exponentBits + 1 );
	//var bias = Math.pow( 2, exponentBits - 1 ) - 1, 
	var bias = maxBits[exponentBits - 1] - 1,
		signal = b.readBits( precisionBits + exponentBits, 1 ), exponent = b.readBits( precisionBits, exponentBits ), significand = 0,
	divisor = 2, curByte = b.buffer.length + ( -precisionBits >> 3 ) - 1;
	do{
		for( var byteValue = b.buffer[ ++curByte ], startBit = precisionBits % 8 || 8, mask = 1 << startBit; mask >>= 1; ( byteValue & mask ) && ( significand += 1 / divisor ), divisor *= 2 );
	}while( precisionBits -= startBit );
	return exponent == ( bias << 1 ) + 1 ? significand ? NaN : signal ? -Infinity : +Infinity : ( 1 + signal * -2 ) * ( exponent || significand ? !exponent ? Math.pow( 2, -bias + 1 ) * significand : Math.pow( 2, exponent - bias ) * ( 1 + significand ) : 0 );
};
p.decodeInt = function( data, bits, signed, forceBigEndian ){
	var b = new this.Buffer( this.bigEndian||forceBigEndian, data ), x = b.readBits( 0, bits ), max = maxBits[bits]; //max = Math.pow( 2, bits );
	return signed && x >= max / 2 ? x - max : x;
};
p.encodeFloat = function( data, precisionBits, exponentBits ){
	//var bias = Math.pow( 2, exponentBits - 1 ) - 1,
	var bias = maxBits[exponentBits - 1] - 1,
		minExp = -bias + 1, maxExp = bias, minUnnormExp = minExp - precisionBits,
	status = isNaN( n = parseFloat( data ) ) || n == -Infinity || n == +Infinity ? n : 0,
	exp = 0, len = 2 * bias + 1 + precisionBits + 3, bin = new Array( len ),
	signal = ( n = status !== 0 ? 0 : n ) < 0, n = Math.abs( n ), intPart = Math.floor( n ), floatPart = n - intPart,
	i, lastBit, rounded, j, result;
	for( i = len; i; bin[--i] = 0 );
	for( i = bias + 2; intPart && i; bin[--i] = intPart % 2, intPart = Math.floor( intPart / 2 ) );
	for( i = bias + 1; floatPart > 0 && i; ( bin[++i] = ( ( floatPart *= 2 ) >= 1 ) - 0 ) && --floatPart );
	for( i = -1; ++i < len && !bin[i]; );
	if( bin[( lastBit = precisionBits - 1 + ( i = ( exp = bias + 1 - i ) >= minExp && exp <= maxExp ? i + 1 : bias + 1 - ( exp = minExp - 1 ) ) ) + 1] ){
		if( !( rounded = bin[lastBit] ) ){
			for( j = lastBit + 2; !rounded && j < len; rounded = bin[j++] );
		}
		for( j = lastBit + 1; rounded && --j >= 0; ( bin[j] = !bin[j] - 0 ) && ( rounded = 0 ) );
	}
	for( i = i - 2 < 0 ? -1 : i - 3; ++i < len && !bin[i]; );
	if( ( exp = bias + 1 - i ) >= minExp && exp <= maxExp )
		++i;
	else if( exp < minExp ){
		exp != bias + 1 - len && exp < minUnnormExp && this.warn( "encodeFloat::float underflow" );
		i = bias + 1 - ( exp = minExp - 1 );
	}
	if( intPart || status !== 0 ){
		this.warn( intPart ? "encodeFloat::float overflow" : "encodeFloat::" + status );
		exp = maxExp + 1;
		i = bias + 2;
		if( status == -Infinity )
			signal = 1;
		else if( isNaN( status ) )
			bin[i] = 1;
	}
	for( n = Math.abs( exp + bias ), j = exponentBits + 1, result = ""; --j; result = ( n % 2 ) + result, n = n >>= 1 );
	for( n = 0, j = 0, i = ( result = ( signal ? "1" : "0" ) + result + bin.slice( i, i + precisionBits ).join( "" ) ).length, r = []; i; j = ( j + 1 ) % 8 ){
		n += ( 1 << j ) * result.charAt( --i );
		if( j == 7 ){
			r[r.length] = String.fromCharCode( n );
			n = 0;
		}
	}
	r[r.length] = n ? String.fromCharCode( n ) : "";
	return ( this.bigEndian ? r.reverse() : r ).join( "" );
};

p.encodeInt = function( data, bits, signed, forceBigEndian ){
	//var max = Math.pow( 2, bits );
	var max = maxBits[bits];
	
	( data >= max || data < -( max / 2 ) ) && this.warn( "encodeInt::overflow" ) && ( data = 0 );
	data < 0 && ( data += max );
	for( var r = []; data; r[r.length] = String.fromCharCode( data % 256 ), data = Math.floor( data / 256 ) );
	for( bits = -( -bits >> 3 ) - r.length; bits--; r[r.length] = "\0" );
	
    return ( (this.bigEndian||forceBigEndian) ? r.reverse() : r ).join( "" );
};
p.toSmall    = function( data ){ return this.decodeInt( data,  8, true  ); };
p.fromSmall  = function( data ){ return this.encodeInt( data,  8, true  ); };
p.toByte     = function( data ){ return this.decodeInt( data,  8, false ); };
p.fromByte   = function( data ){ return this.encodeInt( data,  8, false ); };
p.toShort    = function( data ){ return this.decodeInt( data, 16, true  ); };
p.fromShort  = function( data ){ return this.encodeInt( data, 16, true  ); };
p.toWord     = function( data ){ return this.decodeInt( data, 16, false ); };
p.fromWord   = function( data ){ return this.encodeInt( data, 16, false ); };
p.toInt      = function( data ){ return this.decodeInt( data, 32, true  ); };
p.fromInt    = function( data ){ return this.encodeInt( data, 32, true  ); };
p.toLong     = function( data ){ return this.decodeInt( data, 64, true  ); };
p.fromLong   = function( data ){ return this.encodeInt( data, 64, true  ); };
p.toDWord    = function( data ){ return this.decodeInt( data, 32, false ); };
p.fromDWord  = function( data ){ return this.encodeInt( data, 32, false ); };
p.toQWord    = function( data ){ return this.decodeInt( data, 64, true ); };
p.fromQWord  = function( data ){ return this.encodeInt( data, 64, true ); };
p.toFloat    = function( data ){ return this.decodeFloat( data, 23, 8   ); };
p.fromFloat  = function( data ){ return this.encodeFloat( data, 23, 8   ); };
p.toDouble   = function( data ){ return this.decodeFloat( data, 52, 11  ); };
p.fromDouble = function( data ){ return this.encodeFloat( data, 52, 11  ); };

// Factor out the encode so it can be shared by add_header and push_int32
p.encode_int32 = function(number) {
  var a, b, c, d, unsigned;
  unsigned = (number < 0) ? (number + 0x100000000) : number;
  a = Math.floor(unsigned / 0xffffff);
  unsigned &= 0xffffff;
  b = Math.floor(unsigned / 0xffff);
  unsigned &= 0xffff;
  c = Math.floor(unsigned / 0xff);
  unsigned &= 0xff;
  d = Math.floor(unsigned);
  return chr(a) + chr(b) + chr(c) + chr(d);
};

p.encode_int64 = function(number) {
  var a, b, c, d, e, f, g, h, unsigned;
  unsigned = (number < 0) ? (number + 0x10000000000000000) : number;
  a = Math.floor(unsigned / 0xffffffffffffff);
  unsigned &= 0xffffffffffffff;
  b = Math.floor(unsigned / 0xffffffffffff);
  unsigned &= 0xffffffffffff;
  c = Math.floor(unsigned / 0xffffffffff);
  unsigned &= 0xffffffffff;
  d = Math.floor(unsigned / 0xffffffff);
  unsigned &= 0xffffffff;
  e = Math.floor(unsigned / 0xffffff);
  unsigned &= 0xffffff;
  f = Math.floor(unsigned / 0xffff);
  unsigned &= 0xffff;
  g = Math.floor(unsigned / 0xff);
  unsigned &= 0xff;
  h = Math.floor(unsigned);
  return chr(a) + chr(b) + chr(c) + chr(d) + chr(e) + chr(f) + chr(g) + chr(h);
};

/**
  UTF8 methods
**/

// Take a raw binary string and return a utf8 string
p.decode_utf8 = function(a) {
  var string = "";
  var i = 0;
  var c, c1, c2, c3;
  c = c1 = c2 = 0;

  while ( i < a.length ) {
    c = a.charCodeAt(i);
    if (c < 128) {
      string += String.fromCharCode(c);
      i++;
    } else if((c > 191) && (c < 224)) {
	    c2 = a.charCodeAt(i+1);
      string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
      i += 2;
    } else {
	    c2 = a.charCodeAt(i+1);
	    c3 = a.charCodeAt(i+2);
      string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      i += 3;
    }
  }
  return string;
};

// Encode a cstring correctly
p.encode_cstring = function(s) { 
  return unescape(encodeURIComponent(s)) + p.fromByte(0);
};

// Take a utf8 string and return a binary string
p.encode_utf8 = function(s) {
  var a="";
  for (var n=0; n< s.length; n++) {
    var c=s.charCodeAt(n);
    if (c<128) {
	    a += String.fromCharCode(c);
    } else if ((c>127)&&(c<2048)) {
	    a += String.fromCharCode( (c>>6) | 192) ;
	    a += String.fromCharCode( (c&63) | 128);
    } else {
      a += String.fromCharCode( (c>>12) | 224);
      a += String.fromCharCode( ((c>>6) & 63) | 128);
      a += String.fromCharCode( (c&63) | 128);
    }
  }
  return a;
};

p.hprint = function(s) {
  for (var i=0; i<s.length; i++) {
    if (s.charCodeAt(i)<32) {
      var number = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);
      sys.debug(number+' : ');}
    else {
      var number = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);      
      sys.debug(number+' : '+ s.charAt(i));}
  }
};

p.to_byte_array = function(s) {
  var array = [];
  
  for (var i=0; i<s.length; i++) {
    if (s.charCodeAt(i)<32) {array.push(s.charCodeAt(i));}
    else {array.push(s.charCodeAt(i))}    
  }  
  
  sys.puts(array);
}

p.pprint = function(s) {
  for (var i=0; i<s.length; i++) {
    if (s.charCodeAt(i)<32) {sys.puts(s.charCodeAt(i)+' : ');}
    else {sys.puts(s.charCodeAt(i)+' : '+ s.charAt(i));}
  }
};

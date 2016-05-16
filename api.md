<a name="module_node-libcurl"></a>

## node-libcurl

* [node-libcurl](#module_node-libcurl)
    * _static_
        * [.Curl](#module_node-libcurl.Curl) ⇐ <code>EventEmitter</code>
            * [new Curl()](#new_module_node-libcurl.Curl_new)
            * _instance_
                * ~~[.onData](#module_node-libcurl.Curl+onData) : <code>[onDataCallback](#module_node-libcurl.Easy..onDataCallback)</code>~~
                * ~~[.onHeader](#module_node-libcurl.Curl+onHeader) : <code>[onHeaderCallback](#module_node-libcurl.Easy..onHeaderCallback)</code>~~
                * [.enable(bitmask)](#module_node-libcurl.Curl+enable) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
                * [.disable(bitmask)](#module_node-libcurl.Curl+disable) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
                * [.setOpt(optionIdOrName, optionValue)](#module_node-libcurl.Curl+setOpt) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
                * [.getInfo(infoNameOrId)](#module_node-libcurl.Curl+getInfo) ⇒ <code>String</code> &#124; <code>Number</code> &#124; <code>Array</code>
                * [.setProgressCallback(cb)](#module_node-libcurl.Curl+setProgressCallback) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
                * [.perform()](#module_node-libcurl.Curl+perform) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
                * [.pause(bitmask)](#module_node-libcurl.Curl+pause) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
                * [.reset()](#module_node-libcurl.Curl+reset) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
                * [.dupHandle([shouldCopyCallbacks], [shouldCopyEventListeners])](#module_node-libcurl.Curl+dupHandle) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
                * [.close()](#module_node-libcurl.Curl+close)
                * ["data" (chunk)](#module_node-libcurl.Curl+event_data)
                * ["header" (chunk)](#module_node-libcurl.Curl+event_header)
                * ["error" (err, errCode)](#module_node-libcurl.Curl+event_error)
                * ["end" (status, argBody, argBody)](#module_node-libcurl.Curl+event_end)
            * _static_
                * [.option](#module_node-libcurl.Curl.option) : <code>enum</code>
                * [.multi](#module_node-libcurl.Curl.multi) : <code>enum</code>
                * [.share](#module_node-libcurl.Curl.share) : <code>enum</code>
                * [.lock](#module_node-libcurl.Curl.lock) : <code>enum</code>
                * [.info](#module_node-libcurl.Curl.info) : <code>enum</code>
                * [.auth](#module_node-libcurl.Curl.auth) : <code>enum</code>
                * [.http](#module_node-libcurl.Curl.http) : <code>enum</code>
                * [.pause](#module_node-libcurl.Curl.pause) : <code>enum</code>
                * [.protocol](#module_node-libcurl.Curl.protocol) : <code>enum</code>
                * [.header](#module_node-libcurl.Curl.header) : <code>enum</code>
                * [.code](#module_node-libcurl.Curl.code) : <code>enum</code>
                * [.netrc](#module_node-libcurl.Curl.netrc) : <code>enum</code>
                * [.chunk](#module_node-libcurl.Curl.chunk) : <code>enum</code>
                * [.filetype](#module_node-libcurl.Curl.filetype) : <code>enum</code>
                * [.fnmatchfunc](#module_node-libcurl.Curl.fnmatchfunc) : <code>enum</code>
                * [.ftpauth](#module_node-libcurl.Curl.ftpauth) : <code>enum</code>
                * [.ftpssl](#module_node-libcurl.Curl.ftpssl) : <code>enum</code>
                * [.ftpmethod](#module_node-libcurl.Curl.ftpmethod) : <code>enum</code>
                * [.rtspreq](#module_node-libcurl.Curl.rtspreq) : <code>enum</code>
                * [.ipresolve](#module_node-libcurl.Curl.ipresolve) : <code>enum</code>
                * [.usessl](#module_node-libcurl.Curl.usessl) : <code>enum</code>
                * [.sslversion](#module_node-libcurl.Curl.sslversion) : <code>enum</code>
                * [.ssh_auth](#module_node-libcurl.Curl.ssh_auth) : <code>enum</code>
                * [.timecond](#module_node-libcurl.Curl.timecond) : <code>enum</code>
                * [.feature](#module_node-libcurl.Curl.feature) : <code>enum</code>
                * [.getCount](#module_node-libcurl.Curl.getCount) ⇒ <code>Number</code>
                * [.getVersion](#module_node-libcurl.Curl.getVersion) ⇒ <code>String</code>
                * [.VERSION_NUM](#module_node-libcurl.Curl.VERSION_NUM)
            * _inner_
                * [~progressCallback](#module_node-libcurl.Curl..progressCallback) ⇒ <code>Number</code>
        * [.Easy](#module_node-libcurl.Easy)
            * [new Easy([orig])](#new_module_node-libcurl.Easy_new)
            * _instance_
                * ~~[.onData](#module_node-libcurl.Easy+onData) : <code>[onDataCallback](#module_node-libcurl.Easy..onDataCallback)</code>~~
                * ~~[.onHeader](#module_node-libcurl.Easy+onHeader) : <code>[onHeaderCallback](#module_node-libcurl.Easy..onHeaderCallback)</code>~~
                * [.setOpt(optionIdOrName, optionValue)](#module_node-libcurl.Easy+setOpt) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
                * [.getInfo(infoNameOrId)](#module_node-libcurl.Easy+getInfo) ⇒ <code>[ReturnData](#module_node-libcurl.Easy..ReturnData)</code>
                * [.send(buf)](#module_node-libcurl.Easy+send) ⇒ <code>[ReturnData](#module_node-libcurl.Easy..ReturnData)</code>
                * [.recv(buf)](#module_node-libcurl.Easy+recv) ⇒ <code>module:node-libcurl.Easy.ReturnData</code>
                * [.perform()](#module_node-libcurl.Easy+perform) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
                * [.pause(bitmask)](#module_node-libcurl.Easy+pause) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
                * [.reset()](#module_node-libcurl.Easy+reset) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
                * [.dupHandle()](#module_node-libcurl.Easy+dupHandle) ⇒ <code>[Easy](#module_node-libcurl.Easy)</code>
                * [.onSocketEvent(cb)](#module_node-libcurl.Easy+onSocketEvent) ⇒ <code>[Easy](#module_node-libcurl.Easy)</code>
                * [.monitorSocketEvents()](#module_node-libcurl.Easy+monitorSocketEvents) ⇒ <code>[Easy](#module_node-libcurl.Easy)</code>
                * [.unmonitorSocketEvents()](#module_node-libcurl.Easy+unmonitorSocketEvents) ⇒ <code>[Easy](#module_node-libcurl.Easy)</code>
                * [.close()](#module_node-libcurl.Easy+close)
            * _static_
                * [.socket](#module_node-libcurl.Easy.socket) : <code>enum</code>
                * [.strError(code)](#module_node-libcurl.Easy.strError) ⇒ <code>String</code>
            * _inner_
                * [~ReturnData](#module_node-libcurl.Easy..ReturnData) : <code>Object</code>
                * [~onDataCallback](#module_node-libcurl.Easy..onDataCallback) ⇒ <code>Number</code>
                * [~onHeaderCallback](#module_node-libcurl.Easy..onHeaderCallback) ⇒ <code>Number</code>
                * [~onSocketEventCallback](#module_node-libcurl.Easy..onSocketEventCallback) : <code>function</code>
        * [.Multi](#module_node-libcurl.Multi)
            * [new Multi()](#new_module_node-libcurl.Multi_new)
            * _instance_
                * [.setOpt(optionIdOrName, optionValue)](#module_node-libcurl.Multi+setOpt) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
                * [.addHandle(handle)](#module_node-libcurl.Multi+addHandle) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
                * [.onMessage(cb)](#module_node-libcurl.Multi+onMessage) ⇒ <code>[Multi](#module_node-libcurl.Multi)</code>
                * [.removeHandle(handle)](#module_node-libcurl.Multi+removeHandle) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
                * [.getCount()](#module_node-libcurl.Multi+getCount) ⇒ <code>Number</code>
                * [.close()](#module_node-libcurl.Multi+close)
            * _static_
                * [.strError(code)](#module_node-libcurl.Multi.strError) ⇒ <code>String</code>
            * _inner_
                * [~onMessageCallback](#module_node-libcurl.Multi..onMessageCallback) : <code>function</code>
        * [.Share](#module_node-libcurl.Share)
            * [new Share()](#new_module_node-libcurl.Share_new)
            * _instance_
                * [.setOpt(optionIdOrName, optionValue)](#module_node-libcurl.Share+setOpt) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
                * [.close()](#module_node-libcurl.Share+close)
            * _static_
                * [.strError(code)](#module_node-libcurl.Share.strError) ⇒ <code>String</code>
    * _inner_
        * [~CurlFileInfo](#module_node-libcurl..CurlFileInfo) : <code>Object</code>

<a name="module_node-libcurl.Curl"></a>

### node-libcurl.Curl ⇐ <code>EventEmitter</code>
**Kind**: static class of <code>[node-libcurl](#module_node-libcurl)</code>  
**Extends:** <code>EventEmitter</code>  

* [.Curl](#module_node-libcurl.Curl) ⇐ <code>EventEmitter</code>
    * [new Curl()](#new_module_node-libcurl.Curl_new)
    * _instance_
        * ~~[.onData](#module_node-libcurl.Curl+onData) : <code>[onDataCallback](#module_node-libcurl.Easy..onDataCallback)</code>~~
        * ~~[.onHeader](#module_node-libcurl.Curl+onHeader) : <code>[onHeaderCallback](#module_node-libcurl.Easy..onHeaderCallback)</code>~~
        * [.enable(bitmask)](#module_node-libcurl.Curl+enable) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
        * [.disable(bitmask)](#module_node-libcurl.Curl+disable) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
        * [.setOpt(optionIdOrName, optionValue)](#module_node-libcurl.Curl+setOpt) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
        * [.getInfo(infoNameOrId)](#module_node-libcurl.Curl+getInfo) ⇒ <code>String</code> &#124; <code>Number</code> &#124; <code>Array</code>
        * [.setProgressCallback(cb)](#module_node-libcurl.Curl+setProgressCallback) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
        * [.perform()](#module_node-libcurl.Curl+perform) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
        * [.pause(bitmask)](#module_node-libcurl.Curl+pause) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
        * [.reset()](#module_node-libcurl.Curl+reset) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
        * [.dupHandle([shouldCopyCallbacks], [shouldCopyEventListeners])](#module_node-libcurl.Curl+dupHandle) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
        * [.close()](#module_node-libcurl.Curl+close)
        * ["data" (chunk)](#module_node-libcurl.Curl+event_data)
        * ["header" (chunk)](#module_node-libcurl.Curl+event_header)
        * ["error" (err, errCode)](#module_node-libcurl.Curl+event_error)
        * ["end" (status, argBody, argBody)](#module_node-libcurl.Curl+event_end)
    * _static_
        * [.option](#module_node-libcurl.Curl.option) : <code>enum</code>
        * [.multi](#module_node-libcurl.Curl.multi) : <code>enum</code>
        * [.share](#module_node-libcurl.Curl.share) : <code>enum</code>
        * [.lock](#module_node-libcurl.Curl.lock) : <code>enum</code>
        * [.info](#module_node-libcurl.Curl.info) : <code>enum</code>
        * [.auth](#module_node-libcurl.Curl.auth) : <code>enum</code>
        * [.http](#module_node-libcurl.Curl.http) : <code>enum</code>
        * [.pause](#module_node-libcurl.Curl.pause) : <code>enum</code>
        * [.protocol](#module_node-libcurl.Curl.protocol) : <code>enum</code>
        * [.header](#module_node-libcurl.Curl.header) : <code>enum</code>
        * [.code](#module_node-libcurl.Curl.code) : <code>enum</code>
        * [.netrc](#module_node-libcurl.Curl.netrc) : <code>enum</code>
        * [.chunk](#module_node-libcurl.Curl.chunk) : <code>enum</code>
        * [.filetype](#module_node-libcurl.Curl.filetype) : <code>enum</code>
        * [.fnmatchfunc](#module_node-libcurl.Curl.fnmatchfunc) : <code>enum</code>
        * [.ftpauth](#module_node-libcurl.Curl.ftpauth) : <code>enum</code>
        * [.ftpssl](#module_node-libcurl.Curl.ftpssl) : <code>enum</code>
        * [.ftpmethod](#module_node-libcurl.Curl.ftpmethod) : <code>enum</code>
        * [.rtspreq](#module_node-libcurl.Curl.rtspreq) : <code>enum</code>
        * [.ipresolve](#module_node-libcurl.Curl.ipresolve) : <code>enum</code>
        * [.usessl](#module_node-libcurl.Curl.usessl) : <code>enum</code>
        * [.sslversion](#module_node-libcurl.Curl.sslversion) : <code>enum</code>
        * [.ssh_auth](#module_node-libcurl.Curl.ssh_auth) : <code>enum</code>
        * [.timecond](#module_node-libcurl.Curl.timecond) : <code>enum</code>
        * [.feature](#module_node-libcurl.Curl.feature) : <code>enum</code>
        * [.getCount](#module_node-libcurl.Curl.getCount) ⇒ <code>Number</code>
        * [.getVersion](#module_node-libcurl.Curl.getVersion) ⇒ <code>String</code>
        * [.VERSION_NUM](#module_node-libcurl.Curl.VERSION_NUM)
    * _inner_
        * [~progressCallback](#module_node-libcurl.Curl..progressCallback) ⇒ <code>Number</code>

<a name="new_module_node-libcurl.Curl_new"></a>

#### new Curl()
Wrapper class around one easy handle.
It provides a more *nodejs-friendly* interface.

<a name="module_node-libcurl.Curl+onData"></a>

#### ~~curl.onData : <code>[onDataCallback](#module_node-libcurl.Easy..onDataCallback)</code>~~
***Deprecated***

Use [setOpt](#module_node-libcurl.Curl+setOpt)( Curl.option.WRITEFUNCTION, onDataCallback ) instead.

**Kind**: instance property of <code>[Curl](#module_node-libcurl.Curl)</code>  
<a name="module_node-libcurl.Curl+onHeader"></a>

#### ~~curl.onHeader : <code>[onHeaderCallback](#module_node-libcurl.Easy..onHeaderCallback)</code>~~
***Deprecated***

Use [setOpt](#module_node-libcurl.Curl+setOpt)( Curl.option.HEADERFUNCTION, onHeaderCallback ) instead.

**Kind**: instance property of <code>[Curl](#module_node-libcurl.Curl)</code>  
<a name="module_node-libcurl.Curl+enable"></a>

#### curl.enable(bitmask) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
Enables a feature, should not be used while a request is running.
Check [feature](#module_node-libcurl.Curl.feature).

**Kind**: instance method of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Returns**: <code>[Curl](#module_node-libcurl.Curl)</code> - <code>this</code>  

| Param | Type | Description |
| --- | --- | --- |
| bitmask | <code>Number</code> | Bitmask with the features to enable |

<a name="module_node-libcurl.Curl+disable"></a>

#### curl.disable(bitmask) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
Disables a feature, should not be used while a request is running.
Check [feature](#module_node-libcurl.Curl.feature).

**Kind**: instance method of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Returns**: <code>[Curl](#module_node-libcurl.Curl)</code> - <code>this</code>  

| Param | Type | Description |
| --- | --- | --- |
| bitmask | <code>Number</code> | Bitmask with the features to disable |

<a name="module_node-libcurl.Curl+setOpt"></a>

#### curl.setOpt(optionIdOrName, optionValue) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
Use [option](#module_node-libcurl.Curl.option) for predefined constants.

**Kind**: instance method of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Returns**: <code>[Curl](#module_node-libcurl.Curl)</code> - <code>this</code>  

| Param | Type | Description |
| --- | --- | --- |
| optionIdOrName | <code>String</code> &#124; <code>Number</code> | Option id or name. |
| optionValue | <code>\*</code> | Value is relative to what option you are using. |

<a name="module_node-libcurl.Curl+getInfo"></a>

#### curl.getInfo(infoNameOrId) ⇒ <code>String</code> &#124; <code>Number</code> &#124; <code>Array</code>
Use [info](#module_node-libcurl.Curl.info) for predefined constants.

**Kind**: instance method of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Returns**: <code>String</code> &#124; <code>Number</code> &#124; <code>Array</code> - Return type is based on the info requested.  

| Param | Type | Description |
| --- | --- | --- |
| infoNameOrId | <code>String</code> &#124; <code>Number</code> | Info id or name. |

<a name="module_node-libcurl.Curl+setProgressCallback"></a>

#### curl.setProgressCallback(cb) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
The option XFERINFOFUNCTION was introduced in curl version 7.32.0,
 versions older than that should use PROGRESSFUNCTION.
If you don't want to mess with version numbers you can use this method,
instead of directly calling [setOpt](#module_node-libcurl.Curl+setOpt).

NOPROGRESS should be set to false to make this function actually get called.

**Kind**: instance method of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Returns**: <code>[Curl](#module_node-libcurl.Curl)</code> - <code>this</code>  

| Param | Type |
| --- | --- |
| cb | <code>[progressCallback](#module_node-libcurl.Curl..progressCallback)</code> | 

<a name="module_node-libcurl.Curl+perform"></a>

#### curl.perform() ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
Add this instance to the processing queue.

**Kind**: instance method of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Returns**: <code>[Curl](#module_node-libcurl.Curl)</code> - <code>this</code>  
**Throws**:

- This method should be called only one time per request,
 otherwise it will throw an exception.

<a name="module_node-libcurl.Curl+pause"></a>

#### curl.pause(bitmask) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
Using this function, you can explicitly mark a running connection to get paused, and you can unpause a connection that was previously paused.

The bitmask argument is a set of bits that sets the new state of the connection.

**Kind**: instance method of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Returns**: <code>[Curl](#module_node-libcurl.Curl)</code> - <code>this</code>  

| Param | Type |
| --- | --- |
| bitmask | <code>[pause](#module_node-libcurl.Curl.pause)</code> | 

<a name="module_node-libcurl.Curl+reset"></a>

#### curl.reset() ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
Reset this handle options to their defaults.

**Kind**: instance method of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Returns**: <code>[Curl](#module_node-libcurl.Curl)</code> - <code>this</code>  
<a name="module_node-libcurl.Curl+dupHandle"></a>

#### curl.dupHandle([shouldCopyCallbacks], [shouldCopyEventListeners]) ⇒ <code>[Curl](#module_node-libcurl.Curl)</code>
Duplicate this handle with all their options.
Keep in mind that, by default, this also means anonymous functions
that were set as callbacks and all event listeners.

Using the arguments to change that behaviour.

**Kind**: instance method of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Returns**: <code>[Curl](#module_node-libcurl.Curl)</code> - New handle with all the options set in this handle.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [shouldCopyCallbacks] | <code>Boolean</code> | <code>true</code> | Should copy onData and onHeader callbacks |
| [shouldCopyEventListeners] | <code>Boolean</code> | <code>true</code> | Should copy current event listeners |

<a name="module_node-libcurl.Curl+close"></a>

#### curl.close()
Close this handle.
<strong>NOTE:</strong> After closing the handle, it should not be used anymore!
Doing so will throw an exception.

**Kind**: instance method of <code>[Curl](#module_node-libcurl.Curl)</code>  
<a name="module_node-libcurl.Curl+event_data"></a>

#### "data" (chunk)
Data event

**Kind**: event emitted by <code>[Curl](#module_node-libcurl.Curl)</code>  

| Param | Type | Description |
| --- | --- | --- |
| chunk | <code>Buffer</code> | The data that was received. |

<a name="module_node-libcurl.Curl+event_header"></a>

#### "header" (chunk)
Header event

**Kind**: event emitted by <code>[Curl](#module_node-libcurl.Curl)</code>  

| Param | Type | Description |
| --- | --- | --- |
| chunk | <code>Buffer</code> | The header that was received. |

<a name="module_node-libcurl.Curl+event_error"></a>

#### "error" (err, errCode)
Error event

**Kind**: event emitted by <code>[Curl](#module_node-libcurl.Curl)</code>  

| Param | Type | Description |
| --- | --- | --- |
| err | <code>Error</code> | Error object |
| errCode | <code>Number</code> | libcurl error code. |

<a name="module_node-libcurl.Curl+event_end"></a>

#### "end" (status, argBody, argBody)
End event

**Kind**: event emitted by <code>[Curl](#module_node-libcurl.Curl)</code>  

| Param | Type | Description |
| --- | --- | --- |
| status | <code>Number</code> | Last received response code |
| argBody | <code>String</code> &#124; <code>Buffer</code> | If [Curl.feature.NO_DATA_PARSING](#module_node-libcurl.Curl.feature) is set, a Buffer is passed instead of a string. |
| argBody | <code>Array</code> &#124; <code>Buffer</code> | If [Curl.feature.NO_HEADER_PARSING](#module_node-libcurl.Curl.feature) is set, a Buffer is passed instead of an array with the headers. |

<a name="module_node-libcurl.Curl.option"></a>

#### Curl.option : <code>enum</code>
Options to be used with easy.setOpt or curl.setOpt
See the official documentation of [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html) for reference.

``CURLOPT_URL`` becomes ``Curl.option.URL``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
<a name="module_node-libcurl.Curl.multi"></a>

#### Curl.multi : <code>enum</code>
Options to be used with multi.setOpt()

``CURLMOPT_MAXCONNECTS`` becomes ``Curl.multi.MAXCONNECTS``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
<a name="module_node-libcurl.Curl.share"></a>

#### Curl.share : <code>enum</code>
Options to be used with share.setOpt()

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
**See**: module:node-libcurl.Curl.lock  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| SHARE | <code>Number</code> | <code>1</code> | 
| UNSHARE | <code>Number</code> | <code>2</code> | 

<a name="module_node-libcurl.Curl.lock"></a>

#### Curl.lock : <code>enum</code>
Options to be used with the Curl.share.SHARE and Curl.share.UNSHARE options.

``CURL_LOCK_DATA_COOKIE`` becomes ``Curl.lock.DATA_COOKIE``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| DATA_COOKIE | <code>Number</code> | <code>2</code> | 
| DATA_DNS | <code>Number</code> | <code>3</code> | 
| DATA_SSL_SESSION | <code>Number</code> | <code>4</code> | 

<a name="module_node-libcurl.Curl.info"></a>

#### Curl.info : <code>enum</code>
Infos to be used with easy.getInfo() or curl.getInfo()
See the official documentation of [curl_easy_getinfo()](http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html) for reference.

``CURLINFO_EFFECTIVE_URL`` becomes ``Curl.info.EFFECTIVE_URL``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
<a name="module_node-libcurl.Curl.auth"></a>

#### Curl.auth : <code>enum</code>
Object with bitmasks that should be used with the HTTPAUTH option.

``CURLAUTH_BASIC`` becomes ``Curl.auth.BASIC``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
<a name="module_node-libcurl.Curl.http"></a>

#### Curl.http : <code>enum</code>
Object with constants to be used with the HTTP_VERSION option.

``CURL_HTTP_VERSION_NONE`` becomes ``Curl.http.VERSION_NONE``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
<a name="module_node-libcurl.Curl.pause"></a>

#### Curl.pause : <code>enum</code>
Object with constants to be used with the pause method.

``CURLPAUSE_RECV`` becomes ``Curl.pause.RECV``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
<a name="module_node-libcurl.Curl.protocol"></a>

#### Curl.protocol : <code>enum</code>
Object with the protocols supported by libcurl, as bitmasks.
Should be used when setting PROTOCOLS and REDIR_PROTOCOLS options.

``CURLPROTO_HTTP`` becomes ``Curl.proto.HTTP``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
<a name="module_node-libcurl.Curl.header"></a>

#### Curl.header : <code>enum</code>
Object with the avaialable bitmasks to be used with HEADEROPT.

Available since libcurl version >= 7.37.0

``CURLHEADER_UNIFIED`` becomes ``Curl.header.UNIFIED``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
<a name="module_node-libcurl.Curl.code"></a>

#### Curl.code : <code>enum</code>
Object with the CURLM_ and CURLE_ constants.

``CURLE_OK`` becomes ``Curl.code.CURLE_OK``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
<a name="module_node-libcurl.Curl.netrc"></a>

#### Curl.netrc : <code>enum</code>
Object with constants to be used with NETRC option.

``CURL_NETRC_OPTIONAL`` becomes ``Curl.netrc.OPTIONAL``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| IGNORED | <code>Number</code> | <code>0</code> | The .netrc will never be read. Default. |
| OPTIONAL | <code>Number</code> | <code>1</code> | A user:password in the URL will be preferred to one in the .netrc. |
| REQUIRED | <code>Number</code> | <code>2</code> | A user:password in the URL will be ignored. Unless one is set programmatically, the .netrc will be queried. |

<a name="module_node-libcurl.Curl.chunk"></a>

#### Curl.chunk : <code>enum</code>
Object with constants to be used as the return value for the callbacks set
 with the options ``CHUNK_BGN_FUNCTION`` and ``CHUNK_END_FUNCTION``.

``CURL_CHUNK_BGN_FUNC_OK`` becomes ``Curl.chunk.BGN_FUNC_OK``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| BGN_FUNC_OK | <code>Number</code> | <code>0</code> | 
| BGN_FUNC_FAIL | <code>Number</code> | <code>1</code> | 
| BGN_FUNC_SKIP | <code>Number</code> | <code>2</code> | 
| END_FUNC_OK | <code>Number</code> | <code>0</code> | 
| END_FUNC_FAIL | <code>Number</code> | <code>1</code> | 

<a name="module_node-libcurl.Curl.filetype"></a>

#### Curl.filetype : <code>enum</code>
Object with constants to be used when using the [module:node-libcurl#CurlFileInfo](module:node-libcurl#CurlFileInfo) object,
 mostly used alongside the ``CHUNK_BGN_FUNCTION`` option

``CURLFILETYPE_FILE`` becomes ``Curl.filetype.FILE``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| FILE | <code>Number</code> | <code>0</code> | 
| DIRECTORY | <code>Number</code> | <code>1</code> | 
| SYMLINK | <code>Number</code> | <code>2</code> | 
| DEVICE_BLOCK | <code>Number</code> | <code>3</code> | 
| DEVICE_CHAR | <code>Number</code> | <code>4</code> | 
| NAMEDPIPE | <code>Number</code> | <code>5</code> | 
| SOCKET | <code>Number</code> | <code>6</code> | 
| DOOR | <code>Number</code> | <code>7</code> | 

<a name="module_node-libcurl.Curl.fnmatchfunc"></a>

#### Curl.fnmatchfunc : <code>enum</code>
Object with constants to be used as the return value for the callback set
 with the option ``FNMATCH_FUNCTION``.

``CURL_FNMATCHFUNC_MATCH`` becomes ``Curl.fnmatchfunc.MATCH``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| MATCH | <code>Number</code> | <code>0</code> | 
| NOMATCH | <code>Number</code> | <code>1</code> | 
| FAIL | <code>Number</code> | <code>2</code> | 

<a name="module_node-libcurl.Curl.ftpauth"></a>

#### Curl.ftpauth : <code>enum</code>
Object with constants for option ``FTPSSLAUTH``

``CURLFTPAUTH_DEFAULT`` becomes ``Curl.ftpauth.DEFAULT``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| DEFAULT | <code>Number</code> | <code>0</code> | 
| SSL | <code>Number</code> | <code>1</code> | 
| TLS | <code>Number</code> | <code>2</code> | 

<a name="module_node-libcurl.Curl.ftpssl"></a>

#### Curl.ftpssl : <code>enum</code>
Object with constants for option ``FTP_SSL_CCC``

``CURLFTPSSL_CCC_NONE`` becomes ``Curl.ftpssl.CCC_NONE``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| CCC_NONE | <code>Number</code> | <code>0</code> | 
| CCC_PASSIVE | <code>Number</code> | <code>1</code> | 
| CCC_ACTIVE | <code>Number</code> | <code>2</code> | 

<a name="module_node-libcurl.Curl.ftpmethod"></a>

#### Curl.ftpmethod : <code>enum</code>
Object with constants for option ``FTP_FILEMETHOD``

``CURLFTPMETHOD_MULTICWD`` becomes ``Curl.ftpmethod.MULTICWD``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| DEFAULT | <code>Number</code> | <code>0</code> | 
| MULTICWD | <code>Number</code> | <code>1</code> | 
| NOCWD | <code>Number</code> | <code>2</code> | 
| SINGLECWD | <code>Number</code> | <code>3</code> | 

<a name="module_node-libcurl.Curl.rtspreq"></a>

#### Curl.rtspreq : <code>enum</code>
Object with constants for option ``RTSP_REQUEST``
Only available on libcurl >= 7.20

``CURL_RTSPREQ_OPTIONS`` becomes ``Curl.rtspreq.OPTIONS``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| OPTIONS | <code>Number</code> | <code>0</code> | 
| DESCRIBE | <code>Number</code> | <code>1</code> | 
| ANNOUNCE | <code>Number</code> | <code>2</code> | 
| SETUP | <code>Number</code> | <code>3</code> | 
| PLAY | <code>Number</code> | <code>4</code> | 
| PAUSE | <code>Number</code> | <code>5</code> | 
| TEARDOWN | <code>Number</code> | <code>6</code> | 
| GET_PARAMETER | <code>Number</code> | <code>7</code> | 
| SET_PARAMETER | <code>Number</code> | <code>8</code> | 
| RECORD | <code>Number</code> | <code>9</code> | 
| RECEIVE | <code>Number</code> | <code>10</code> | 

<a name="module_node-libcurl.Curl.ipresolve"></a>

#### Curl.ipresolve : <code>enum</code>
Object with constants for option ``IPRESOLVE``

``CURL_IPRESOLVE_V4`` becomes ``Curl.ipresolve.V4``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| WHATEVER | <code>Number</code> | <code>0</code> | 
| V4 | <code>Number</code> | <code>1</code> | 
| V6 | <code>Number</code> | <code>2</code> | 

<a name="module_node-libcurl.Curl.usessl"></a>

#### Curl.usessl : <code>enum</code>
Object with constants for option ``USE_SSL``

``CURLUSESSL_NONE`` becomes ``Curl.usessl.NONE``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| NONE | <code>Number</code> | <code>0</code> | 
| TRY | <code>Number</code> | <code>1</code> | 
| CONTROL | <code>Number</code> | <code>2</code> | 
| ALL | <code>Number</code> | <code>3</code> | 

<a name="module_node-libcurl.Curl.sslversion"></a>

#### Curl.sslversion : <code>enum</code>
Object with constants for option ``SSLVERSION``

``CURL_SSLVERSION_DEFAULT`` becomes ``Curl.sslversion.DEFAULT``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| DEFAULT | <code>Number</code> | <code>0</code> | 
| TLSv1 | <code>Number</code> | <code>1</code> | 
| SSLv2 | <code>Number</code> | <code>2</code> | 
| SSLv3 | <code>Number</code> | <code>3</code> | 

<a name="module_node-libcurl.Curl.ssh_auth"></a>

#### Curl.ssh_auth : <code>enum</code>
Object with constants for option ``SSH_AUTH_TYPES``

``CURLSSH_AUTH_PASSWORD`` becomes ``Curl.ssh_auth.PASSWORD``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| ANY | <code>Number</code> | <code>~0</code> | 
| NONE | <code>Number</code> | <code>0</code> | 
| PUBLICKEY | <code>Number</code> | <code></code> | 
| PASSWORD | <code>Number</code> | <code></code> | 
| HOST | <code>Number</code> | <code></code> | 
| KEYBOARD | <code>Number</code> | <code></code> | 

<a name="module_node-libcurl.Curl.timecond"></a>

#### Curl.timecond : <code>enum</code>
Object with constants for option ``TIMECONDITION``

``CURL_TIMECOND_IFMODSINCE`` becomes ``Curl.timecond.IFMODSINCE``

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| IFMODSINCE | <code>Number</code> | <code>0</code> | 
| IFUNMODSINCE | <code>Number</code> | <code>1</code> | 

<a name="module_node-libcurl.Curl.feature"></a>

#### Curl.feature : <code>enum</code>
Object with the features currently supported as bitmasks.

**Kind**: static enum property of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Read only**: true  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| NO_DATA_PARSING | <code>Number</code> | <code></code> | Data received is passed as a Buffer to the end event. |
| NO_HEADER_PARSING | <code>Number</code> | <code></code> | Header received is not parsed, it's passed as a Buffer to the end event. |
| RAW | <code>Number</code> | <code></code> | Same than ``NO_DATA_PARSING | NO_HEADER_PARSING`` |
| NO_DATA_STORAGE | <code>Number</code> | <code></code> | Data received is not stored inside this handle, implies NO_DATA_PARSING. |
| NO_HEADER_STORAGE | <code>Number</code> | <code></code> | Header received is not stored inside this handle, implies NO_HEADER_PARSING. |
| NO_STORAGE | <code>Number</code> | <code></code> | Same than ``NO_DATA_STORAGE | NO_HEADER_STORAGE``, implies RAW. |

<a name="module_node-libcurl.Curl.getCount"></a>

#### Curl.getCount ⇒ <code>Number</code>
Returns the number of handles currently open in the internal multi handle being used.

**Kind**: static property of <code>[Curl](#module_node-libcurl.Curl)</code>  
<a name="module_node-libcurl.Curl.getVersion"></a>

#### Curl.getVersion ⇒ <code>String</code>
Returns libcurl version string.
The string shows which features are enabled,
 and the version of the libraries that libcurl was built with.

**Kind**: static property of <code>[Curl](#module_node-libcurl.Curl)</code>  
<a name="module_node-libcurl.Curl.VERSION_NUM"></a>

#### Curl.VERSION_NUM
Current libcurl version

**Kind**: static constant of <code>[Curl](#module_node-libcurl.Curl)</code>  
<a name="module_node-libcurl.Curl..progressCallback"></a>

#### Curl~progressCallback ⇒ <code>Number</code>
Progress callback called by libcurl.

**Kind**: inner typedef of <code>[Curl](#module_node-libcurl.Curl)</code>  
**Returns**: <code>Number</code> - Returning a non-zero value from this callback will cause libcurl to abort the transfer and return CURLE_ABORTED_BY_CALLBACK.  
**this**: <code>{module:node-libcurl.Easy}</code>  

| Param | Type | Description |
| --- | --- | --- |
| dltotal | <code>Number</code> | Total number of bytes libcurl expects to download in this transfer. |
| dlnow | <code>Number</code> | Number of bytes downloaded so far. |
| ultotal | <code>Number</code> | Total number of bytes libcurl expects to upload in this transfer. |
| ulnow | <code>Number</code> | Number of bytes uploaded so far. |

<a name="module_node-libcurl.Easy"></a>

### node-libcurl.Easy
**Kind**: static class of <code>[node-libcurl](#module_node-libcurl)</code>  

* [.Easy](#module_node-libcurl.Easy)
    * [new Easy([orig])](#new_module_node-libcurl.Easy_new)
    * _instance_
        * ~~[.onData](#module_node-libcurl.Easy+onData) : <code>[onDataCallback](#module_node-libcurl.Easy..onDataCallback)</code>~~
        * ~~[.onHeader](#module_node-libcurl.Easy+onHeader) : <code>[onHeaderCallback](#module_node-libcurl.Easy..onHeaderCallback)</code>~~
        * [.setOpt(optionIdOrName, optionValue)](#module_node-libcurl.Easy+setOpt) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
        * [.getInfo(infoNameOrId)](#module_node-libcurl.Easy+getInfo) ⇒ <code>[ReturnData](#module_node-libcurl.Easy..ReturnData)</code>
        * [.send(buf)](#module_node-libcurl.Easy+send) ⇒ <code>[ReturnData](#module_node-libcurl.Easy..ReturnData)</code>
        * [.recv(buf)](#module_node-libcurl.Easy+recv) ⇒ <code>module:node-libcurl.Easy.ReturnData</code>
        * [.perform()](#module_node-libcurl.Easy+perform) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
        * [.pause(bitmask)](#module_node-libcurl.Easy+pause) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
        * [.reset()](#module_node-libcurl.Easy+reset) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
        * [.dupHandle()](#module_node-libcurl.Easy+dupHandle) ⇒ <code>[Easy](#module_node-libcurl.Easy)</code>
        * [.onSocketEvent(cb)](#module_node-libcurl.Easy+onSocketEvent) ⇒ <code>[Easy](#module_node-libcurl.Easy)</code>
        * [.monitorSocketEvents()](#module_node-libcurl.Easy+monitorSocketEvents) ⇒ <code>[Easy](#module_node-libcurl.Easy)</code>
        * [.unmonitorSocketEvents()](#module_node-libcurl.Easy+unmonitorSocketEvents) ⇒ <code>[Easy](#module_node-libcurl.Easy)</code>
        * [.close()](#module_node-libcurl.Easy+close)
    * _static_
        * [.socket](#module_node-libcurl.Easy.socket) : <code>enum</code>
        * [.strError(code)](#module_node-libcurl.Easy.strError) ⇒ <code>String</code>
    * _inner_
        * [~ReturnData](#module_node-libcurl.Easy..ReturnData) : <code>Object</code>
        * [~onDataCallback](#module_node-libcurl.Easy..onDataCallback) ⇒ <code>Number</code>
        * [~onHeaderCallback](#module_node-libcurl.Easy..onHeaderCallback) ⇒ <code>Number</code>
        * [~onSocketEventCallback](#module_node-libcurl.Easy..onSocketEventCallback) : <code>function</code>

<a name="new_module_node-libcurl.Easy_new"></a>

#### new Easy([orig])
Easy handle constructor


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [orig] | <code>Easy</code> | <code></code> | Creates this handle based on another one, this is going to be the same than calling <code>orig.dupHandle();</code> |

<a name="module_node-libcurl.Easy+onData"></a>

#### ~~easy.onData : <code>[onDataCallback](#module_node-libcurl.Easy..onDataCallback)</code>~~
***Deprecated***

Use [setOpt](#module_node-libcurl.Easy+setOpt)( Curl.option.WRITEFUNCTION, onDataCallback ) instead.

**Kind**: instance property of <code>[Easy](#module_node-libcurl.Easy)</code>  
<a name="module_node-libcurl.Easy+onHeader"></a>

#### ~~easy.onHeader : <code>[onHeaderCallback](#module_node-libcurl.Easy..onHeaderCallback)</code>~~
***Deprecated***

Use [setOpt](#module_node-libcurl.Easy+setOpt)( Curl.option.HEADERFUNCTION, onHeaderCallback ) instead.

**Kind**: instance property of <code>[Easy](#module_node-libcurl.Easy)</code>  
<a name="module_node-libcurl.Easy+setOpt"></a>

#### easy.setOpt(optionIdOrName, optionValue) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
Use [option](#module_node-libcurl.Curl.option) for predefined constants.

Official libcurl documentation: [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)

**Kind**: instance method of <code>[Easy](#module_node-libcurl.Easy)</code>  
**Returns**: <code>[code](#module_node-libcurl.Curl.code)</code> - code Should be <code>Curl.code.CURLE_OK</code>.  

| Param | Type | Description |
| --- | --- | --- |
| optionIdOrName | <code>String</code> &#124; <code>Number</code> | Option id or name. |
| optionValue | <code>\*</code> | Value is relative to what option you are using. |

<a name="module_node-libcurl.Easy+getInfo"></a>

#### easy.getInfo(infoNameOrId) ⇒ <code>[ReturnData](#module_node-libcurl.Easy..ReturnData)</code>
Use [info](#module_node-libcurl.Curl.info) for predefined constants.

Official libcurl documentation: [curl_easy_getinfo()](http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html)

**Kind**: instance method of <code>[Easy](#module_node-libcurl.Easy)</code>  
**Returns**: <code>[ReturnData](#module_node-libcurl.Easy..ReturnData)</code> - .data will be the requested info  

| Param | Type | Description |
| --- | --- | --- |
| infoNameOrId | <code>String</code> &#124; <code>Number</code> | Info id or name. |

<a name="module_node-libcurl.Easy+send"></a>

#### easy.send(buf) ⇒ <code>[ReturnData](#module_node-libcurl.Easy..ReturnData)</code>
Sends arbitrary data over the established connection.

Official libcurl documentation: [curl_easy_send()](http://curl.haxx.se/libcurl/c/curl_easy_send.html)

**Kind**: instance method of <code>[Easy](#module_node-libcurl.Easy)</code>  
**Returns**: <code>[ReturnData](#module_node-libcurl.Easy..ReturnData)</code> - .data will be the numbers of bytes sent.  

| Param | Type | Description |
| --- | --- | --- |
| buf | <code>Buffer</code> | The data to be sent |

<a name="module_node-libcurl.Easy+recv"></a>

#### easy.recv(buf) ⇒ <code>module:node-libcurl.Easy.ReturnData</code>
Receives arbitrary data over the established connection.

Official libcurl documentation: [curl_easy_recv()](http://curl.haxx.se/libcurl/c/curl_easy_recv.html)

**Kind**: instance method of <code>[Easy](#module_node-libcurl.Easy)</code>  
**Returns**: <code>module:node-libcurl.Easy.ReturnData</code> - .data will be the numbers of bytes received.  

| Param | Type | Description |
| --- | --- | --- |
| buf | <code>Buffer</code> | The data will be stored inside this Buffer instance. You need to make sure that the buffer has enought space to store it all. |

<a name="module_node-libcurl.Easy+perform"></a>

#### easy.perform() ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
Performs the entire request in a blocking manner and returns when done.

Official libcurl documentation: [http://curl.haxx.se/libcurl/c/curl_easy_perform.html](http://curl.haxx.se/libcurl/c/curl_easy_perform.html)

**Kind**: instance method of <code>[Easy](#module_node-libcurl.Easy)</code>  
**Returns**: <code>[code](#module_node-libcurl.Curl.code)</code> - code Should be <code>Curl.code.CURLE_OK</code>.  
<a name="module_node-libcurl.Easy+pause"></a>

#### easy.pause(bitmask) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
Using this function, you can explicitly mark a running connection
to get paused, and you can unpause a connection that was previously paused.

Official libcurl documentation: [curl_easy_pause()](http://curl.haxx.se/libcurl/c/curl_easy_pause.html)

**Kind**: instance method of <code>[Easy](#module_node-libcurl.Easy)</code>  
**Returns**: <code>[code](#module_node-libcurl.Curl.code)</code> - code Should be <code>Curl.code.CURLE_OK</code>.  

| Param | Type | Description |
| --- | --- | --- |
| bitmask | <code>[pause](#module_node-libcurl.Curl.pause)</code> | bitmask set of bits that sets the new state of the connection. |

<a name="module_node-libcurl.Easy+reset"></a>

#### easy.reset() ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
Reset this handle to their original state.

Official libcurl documentation: [curl_easy_reset()](http://curl.haxx.se/libcurl/c/curl_easy_reset.html)

**Kind**: instance method of <code>[Easy](#module_node-libcurl.Easy)</code>  
**Returns**: <code>[code](#module_node-libcurl.Curl.code)</code> - code Should be <code>Curl.code.CURLE_OK</code>.  
<a name="module_node-libcurl.Easy+dupHandle"></a>

#### easy.dupHandle() ⇒ <code>[Easy](#module_node-libcurl.Easy)</code>
Duplicate this handle with all their options

Official libcurl documentation: [curl_easy_duphandle()](http://curl.haxx.se/libcurl/c/curl_easy_duphandle.html)

**Kind**: instance method of <code>[Easy](#module_node-libcurl.Easy)</code>  
**Returns**: <code>[Easy](#module_node-libcurl.Easy)</code> - handle Returns the new handle.  
<a name="module_node-libcurl.Easy+onSocketEvent"></a>

#### easy.onSocketEvent(cb) ⇒ <code>[Easy](#module_node-libcurl.Easy)</code>
The only time this method should be used is when one enables
 the internal polling of the connection socket used by this handle (by
 calling [Easy#monitorSocketEvents](#module_node-libcurl.Easy+monitorSocketEvents)),
 the callback is going to be called everytime there is some change to the socket.

 One use case for that is when using the
 [Easy#send](#module_node-libcurl.Easy+send)
 and [Easy#recv](#module_node-libcurl.Easy+recv) methods.

**Kind**: instance method of <code>[Easy](#module_node-libcurl.Easy)</code>  
**Returns**: <code>[Easy](#module_node-libcurl.Easy)</code> - <code>this</code>  

| Param | Type |
| --- | --- |
| cb | <code>[onSocketEventCallback](#module_node-libcurl.Easy..onSocketEventCallback)</code> | 

<a name="module_node-libcurl.Easy+monitorSocketEvents"></a>

#### easy.monitorSocketEvents() ⇒ <code>[Easy](#module_node-libcurl.Easy)</code>
Start monitoring for events in the connection socket used by this handle.

**Kind**: instance method of <code>[Easy](#module_node-libcurl.Easy)</code>  
**Returns**: <code>[Easy](#module_node-libcurl.Easy)</code> - <code>this</code>  
**See**: module:node-libcurl.Easy#unmonitorSocketEvents  
<a name="module_node-libcurl.Easy+unmonitorSocketEvents"></a>

#### easy.unmonitorSocketEvents() ⇒ <code>[Easy](#module_node-libcurl.Easy)</code>
Stop monitoring for events in the connection socket used by this handle.

**Kind**: instance method of <code>[Easy](#module_node-libcurl.Easy)</code>  
**Returns**: <code>[Easy](#module_node-libcurl.Easy)</code> - <code>this</code>  
**See**: module:node-libcurl.Easy#monitorSocketEvents  
<a name="module_node-libcurl.Easy+close"></a>

#### easy.close()
Close this handle and dispose any resources bound to it.
After closed, the handle **MUST** not be used again.

This is basically the same than [curl_easy_cleanup()](http://curl.haxx.se/libcurl/c/curl_easy_cleanup.html)

**Kind**: instance method of <code>[Easy](#module_node-libcurl.Easy)</code>  
<a name="module_node-libcurl.Easy.socket"></a>

#### Easy.socket : <code>enum</code>
**Kind**: static enum property of <code>[Easy](#module_node-libcurl.Easy)</code>  
**Read only**: true  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| READABLE | <code>Number</code> | <code>1</code> | 
| WRITABLE | <code>Number</code> | <code>2</code> | 

<a name="module_node-libcurl.Easy.strError"></a>

#### Easy.strError(code) ⇒ <code>String</code>
Returns a description for the given error code.

Official libcurl documentation: [curl_easy_strerror()](http://curl.haxx.se/libcurl/c/curl_easy_strerror.html)

**Kind**: static method of <code>[Easy](#module_node-libcurl.Easy)</code>  

| Param | Type |
| --- | --- |
| code | <code>[code](#module_node-libcurl.Curl.code)</code> | 

<a name="module_node-libcurl.Easy..ReturnData"></a>

#### Easy~ReturnData : <code>Object</code>
This literal object is returned for calls that cannot return single values.
Like [getInfo](#module_node-libcurl.Easy+getInfo) and [send](#module_node-libcurl.Easy+send)

**Kind**: inner typedef of <code>[Easy](#module_node-libcurl.Easy)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| code | <code>[code](#module_node-libcurl.Curl.code)</code> | The return code for the given method call. It should be equals <code>Curl.code.CURLE_OK</code> to be valid. |
| data | <code>\*</code> | Data returned from the method call. |

<a name="module_node-libcurl.Easy..onDataCallback"></a>

#### Easy~onDataCallback ⇒ <code>Number</code>
onData callback for taking care of the data we just received.
This is basically the
[CURLOPT_WRITEFUNCTION](http://curl.haxx.se/libcurl/c/CURLOPT_WRITEFUNCTION.html)
option.

**Kind**: inner typedef of <code>[Easy](#module_node-libcurl.Easy)</code>  
**Returns**: <code>Number</code> - The callback must return exactly nmemb * size, otherwise
it will signal libcurl to abort the transfer, and return with error code CURLE_WRITE_ERROR.

You can return <code>Curl.pause.WRITEFUNC</code> too, this will cause this transfer to become paused.  
**this**: <code>{module:node-libcurl.Easy}</code>  
**See**: module:node-libcurl.Easy#onData  

| Param | Type |
| --- | --- |
| buf | <code>Buffer</code> | 
| size | <code>Number</code> | 
| nitems | <code>Number</code> | 

<a name="module_node-libcurl.Easy..onHeaderCallback"></a>

#### Easy~onHeaderCallback ⇒ <code>Number</code>
onHeader callback for taking care of the headers we just received.
This is basically the
[CURLOPT_HEADERFUNCTION](http://curl.haxx.se/libcurl/c/CURLOPT_HEADERFUNCTION.html)
option.

**Kind**: inner typedef of <code>[Easy](#module_node-libcurl.Easy)</code>  
**Returns**: <code>Number</code> - The callback must return exactly nmemb * size, otherwise
it will signal libcurl to abort the transfer, and return with error code CURLE_WRITE_ERROR.  
**this**: <code>{module:node-libcurl.Easy}</code>  
**See**: module:node-libcurl.Easy#onHeader  

| Param | Type |
| --- | --- |
| buf | <code>Buffer</code> | 
| size | <code>Number</code> | 
| nitems | <code>Number</code> | 

<a name="module_node-libcurl.Easy..onSocketEventCallback"></a>

#### Easy~onSocketEventCallback : <code>function</code>
OnSocketEvent callback called when there are changes to the connection socket.

**Kind**: inner typedef of <code>[Easy](#module_node-libcurl.Easy)</code>  
**this**: <code>{module:node-libcurl.Easy}</code>  

| Param | Type | Description |
| --- | --- | --- |
| err | <code>Error</code> | Should be null if there are no errors. |
| events | <code>[socket](#module_node-libcurl.Easy.socket)</code> | The events that were detected in the socket |

<a name="module_node-libcurl.Multi"></a>

### node-libcurl.Multi
**Kind**: static class of <code>[node-libcurl](#module_node-libcurl)</code>  

* [.Multi](#module_node-libcurl.Multi)
    * [new Multi()](#new_module_node-libcurl.Multi_new)
    * _instance_
        * [.setOpt(optionIdOrName, optionValue)](#module_node-libcurl.Multi+setOpt) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
        * [.addHandle(handle)](#module_node-libcurl.Multi+addHandle) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
        * [.onMessage(cb)](#module_node-libcurl.Multi+onMessage) ⇒ <code>[Multi](#module_node-libcurl.Multi)</code>
        * [.removeHandle(handle)](#module_node-libcurl.Multi+removeHandle) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
        * [.getCount()](#module_node-libcurl.Multi+getCount) ⇒ <code>Number</code>
        * [.close()](#module_node-libcurl.Multi+close)
    * _static_
        * [.strError(code)](#module_node-libcurl.Multi.strError) ⇒ <code>String</code>
    * _inner_
        * [~onMessageCallback](#module_node-libcurl.Multi..onMessageCallback) : <code>function</code>

<a name="new_module_node-libcurl.Multi_new"></a>

#### new Multi()
Multi handle constructor

<a name="module_node-libcurl.Multi+setOpt"></a>

#### multi.setOpt(optionIdOrName, optionValue) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
Use [multi](#module_node-libcurl.Curl.multi) for predefined constants.

Official libcurl documentation: [curl_multi_setopt()](http://curl.haxx.se/libcurl/c/curl_multi_setopt.html)

**Kind**: instance method of <code>[Multi](#module_node-libcurl.Multi)</code>  
**Returns**: <code>[code](#module_node-libcurl.Curl.code)</code> - code Should be <code>Curl.code.CURLM_OK</code>.  

| Param | Type | Description |
| --- | --- | --- |
| optionIdOrName | <code>String</code> &#124; <code>Number</code> | Option id or name. |
| optionValue | <code>\*</code> | Value is relative to what option you are using. |

<a name="module_node-libcurl.Multi+addHandle"></a>

#### multi.addHandle(handle) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
Adds an easy handle to be managed by this multi instance.

Official libcurl documentation: [curl_multi_add_handle()](http://curl.haxx.se/libcurl/c/curl_multi_add_handle.html)

**Kind**: instance method of <code>[Multi](#module_node-libcurl.Multi)</code>  
**Returns**: <code>[code](#module_node-libcurl.Curl.code)</code> - code Should be <code>Curl.code.CURLM_OK</code>.  

| Param | Type |
| --- | --- |
| handle | <code>[Easy](#module_node-libcurl.Easy)</code> | 

<a name="module_node-libcurl.Multi+onMessage"></a>

#### multi.onMessage(cb) ⇒ <code>[Multi](#module_node-libcurl.Multi)</code>
This is basically an abstraction over [curl_multi_info_read()](http://curl.haxx.se/libcurl/c/curl_multi_info_read.html).

**Kind**: instance method of <code>[Multi](#module_node-libcurl.Multi)</code>  
**Returns**: <code>[Multi](#module_node-libcurl.Multi)</code> - <code>this</code>  

| Param | Type | Description |
| --- | --- | --- |
| cb | <code>[onMessageCallback](#module_node-libcurl.Multi..onMessageCallback)</code> &#124; <code>null</code> | You can pass null to remove the current callback set. |

<a name="module_node-libcurl.Multi+removeHandle"></a>

#### multi.removeHandle(handle) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
Removes an easy handle that was inside this multi instance.

Official libcurl documentation: [curl_multi_remove_handle()](http://curl.haxx.se/libcurl/c/curl_multi_remove_handle.html)

**Kind**: instance method of <code>[Multi](#module_node-libcurl.Multi)</code>  
**Returns**: <code>[code](#module_node-libcurl.Curl.code)</code> - code Should be <code>Curl.code.CURLM_OK</code>.  

| Param | Type |
| --- | --- |
| handle | <code>[Easy](#module_node-libcurl.Easy)</code> | 

<a name="module_node-libcurl.Multi+getCount"></a>

#### multi.getCount() ⇒ <code>Number</code>
Utility method that returns the number of easy handles that are inside this instance.

**Kind**: instance method of <code>[Multi](#module_node-libcurl.Multi)</code>  
**Returns**: <code>Number</code> - count  
<a name="module_node-libcurl.Multi+close"></a>

#### multi.close()
Closes this multi handle.
Keep in mind that this doesn't closes the easy handles
that were still inside this multi instance, you must do it manually.

This is basically the same than [curl_multi_cleanup()](http://curl.haxx.se/libcurl/c/curl_multi_cleanup.html)

**Kind**: instance method of <code>[Multi](#module_node-libcurl.Multi)</code>  
<a name="module_node-libcurl.Multi.strError"></a>

#### Multi.strError(code) ⇒ <code>String</code>
Returns a description for the given error code.

Official libcurl documentation: [curl_multi_strerror()](http://curl.haxx.se/libcurl/c/curl_multi_strerror.html)

**Kind**: static method of <code>[Multi](#module_node-libcurl.Multi)</code>  

| Param | Type |
| --- | --- |
| code | <code>[code](#module_node-libcurl.Curl.code)</code> | 

<a name="module_node-libcurl.Multi..onMessageCallback"></a>

#### Multi~onMessageCallback : <code>function</code>
OnMessage callback called when there
are new informations about handles inside this multi instance.

**Kind**: inner typedef of <code>[Multi](#module_node-libcurl.Multi)</code>  
**this**: <code>{module:node-libcurl.Multi}</code>  
**See**: module:node-libcurl.Multi#onMessage  

| Param | Type | Description |
| --- | --- | --- |
| err | <code>Error</code> | Should be null if there are no errors. |
| easy | <code>[Easy](#module_node-libcurl.Easy)</code> | The easy handle that triggered the message. |
| errCode | <code>[code](#module_node-libcurl.Curl.code)</code> |  |

<a name="module_node-libcurl.Share"></a>

### node-libcurl.Share
**Kind**: static class of <code>[node-libcurl](#module_node-libcurl)</code>  

* [.Share](#module_node-libcurl.Share)
    * [new Share()](#new_module_node-libcurl.Share_new)
    * _instance_
        * [.setOpt(optionIdOrName, optionValue)](#module_node-libcurl.Share+setOpt) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
        * [.close()](#module_node-libcurl.Share+close)
    * _static_
        * [.strError(code)](#module_node-libcurl.Share.strError) ⇒ <code>String</code>

<a name="new_module_node-libcurl.Share_new"></a>

#### new Share()
Share handle constructor

<a name="module_node-libcurl.Share+setOpt"></a>

#### share.setOpt(optionIdOrName, optionValue) ⇒ <code>[code](#module_node-libcurl.Curl.code)</code>
Use [share](#module_node-libcurl.Curl.share) for predefined constants.

Official libcurl documentation: [curl_share_setopt()](http://curl.haxx.se/libcurl/c/curl_share_setopt.html)

**Kind**: instance method of <code>[Share](#module_node-libcurl.Share)</code>  
**Returns**: <code>[code](#module_node-libcurl.Curl.code)</code> - code Should be <code>Curl.code.CURLSHE_OK</code>.  

| Param | Type | Description |
| --- | --- | --- |
| optionIdOrName | <code>String</code> &#124; <code>Number</code> | Option id or name. |
| optionValue | <code>\*</code> | Value is relative to what option you are using. |

<a name="module_node-libcurl.Share+close"></a>

#### share.close()
Closes this share handle.

This is basically the same than [curl_share_cleanup()](http://curl.haxx.se/libcurl/c/curl_share_cleanup.html)

**Kind**: instance method of <code>[Share](#module_node-libcurl.Share)</code>  
<a name="module_node-libcurl.Share.strError"></a>

#### Share.strError(code) ⇒ <code>String</code>
Returns a description for the given error code.

Official libcurl documentation: [curl_share_strerror()](http://curl.haxx.se/libcurl/c/curl_share_strerror.html)

**Kind**: static method of <code>[Share](#module_node-libcurl.Share)</code>  

| Param | Type |
| --- | --- |
| code | <code>[code](#module_node-libcurl.Curl.code)</code> | 

<a name="module_node-libcurl..CurlFileInfo"></a>

### node-libcurl~CurlFileInfo : <code>Object</code>
CurlFileInfo data type, the first parameter
passed to the callback set using the option ``CHUNK_BGN_FUNCTION``.

**Kind**: inner typedef of <code>[node-libcurl](#module_node-libcurl)</code>  
**Read only**: true  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| fileName | <code>String</code> |  |
| fileType | <code>Number</code> | Value to be used with [filetype](#module_node-libcurl.Curl.filetype) |
| time | <code>Date</code> |  |
| perm | <code>Number</code> |  |
| uid | <code>Number</code> |  |
| gid | <code>Number</code> |  |
| size | <code>Number</code> |  |
| hardLinks | <code>Number</code> |  |
| strings | <code>Object</code> |  |
| strings.time | <code>String</code> |  |
| strings.perm | <code>String</code> |  |
| strings.user | <code>String</code> |  |
| strings.group | <code>String</code> |  |
| strings.target | <code>String</code> &#124; <code>Null</code> |  |


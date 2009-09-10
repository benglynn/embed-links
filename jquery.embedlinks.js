/*
http://code.google.com/p/jquery-embedlinks/
*/
 
/*jslint browser: true, rhino: true, newcap: true */

 /*globals jQuery, swfobject, window, escape */

/*
Todo: Providers to have an additional param with less amiguous url scheme, to 
      test against hrefs and reduce unnecessay requests
Todo: Specialise video providers with thumbnail to show image if no flash
Todo: Other endpoints
Todo: Default options should default to no max and no min width
Todo: Turn these todos into tickets
Todo: Consider adding Links class, or changing from Provider to Link class
Todo: Add comment explaining how qs params are added, give youtube example
Todo: talk about noembed in example
*/

(function($) {

	// Constants
	var FLASH_VERSION_REQUIRED = "9.0.0";
	
	// Default properties
	var defaultOptions = {
		maxwidth: 800,
		maxheight: 800
	};
	
	// Return dimensions maintaining aspect ratio
	// separated for unit testing
	function getDimensions(width, height, maxwidth, maxheight) {
		if(width < maxwidth && height < maxheight) {
			return [width, height];
		}
		else if(width > height) {
			return [width*maxwidth/width, height*maxwidth/width];
		}
		else return [width*maxheight/height, height*maxheight/height];
	}

	// Utility to extend a class
	function extend(SuperCon, SubCon) {
		SubCon.prototype = new SuperCon();
		// Superclass will be available as super_ in subclass
		SubCon.prototype.super_ = SuperCon.prototype;
	}

	// log checks for existance of console
	function log() {
		// Firebug can handle multiple arguments
		if(window.console && navigator.userAgent.match(/Firefox/) !== null) {
			console.log.apply(this, arguments);
		}
		// Webkit must have one string
		else if(arguments[0] && window.console) {
			console.log(arguments[0].toString());
		}
	}
	log(); // Use at least once for JSLint
	
	// Provider class 
	function Provider(id, urlSchemeStart) {
		this.id = id;
		this.urlSchemeStart = urlSchemeStart;
		this.apiEndPoint = 'http://oohembed.com/oohembed/';
	}
	
	// Return true if the provider handles the passed url, false otherwise
	Provider.prototype.handlesUrl = function(url) {
		return url.indexOf(this.urlSchemeStart) === 0;
	};
	
	// Embed media in place of an anchor
	Provider.prototype.embedLink = function(anchor, newOptions) {
		var options = $.extend({}, defaultOptions, newOptions);
		
		var url = this.apiEndPoint +
			'?url=' + escape(anchor.attr('href')) + 
			'&format=json' + 
			'&maxwidth=' + options.maxwidth + 
			'&maxheight=' + options.maxheight + 
			// jQuery changes ? for a jsonp callback
			'&callback=?';
			
		var provider = this;
		$.getJSON(url, function(data) {
			// Callback
			provider.onJson(data, anchor, options);
		});
	};
	
	// Parse data for properties necessry for embed. Width and height are common
	// to all media.
	Provider.prototype.parseData = function(data) {
		var parsedData = {};
		parsedData.width = parseInt(data.width, 10);
		parsedData.height = parseInt(data.height, 10);
		return parsedData;
	};
	
	// Validate parsed data, failing on any NaN numbers or undefined values
	// and checking against any relevant options
	Provider.prototype.validateData = function(parsedData, options) {
		for(var property in parsedData) {
			if(parsedData.hasOwnProperty(property)) {
				var value = parsedData[property];
				if((typeof value === "number" && isNaN(value)) || typeof value === "undefined") {
					return false;
				}
			}
		}
		// If necessary trim dimensions to comply with maxwidth and maxheight
		var dimensions = getDimensions(parsedData.width, parsedData.height, options.maxwidth, options.maxheight);
		parsedData.width = dimensions[0];
		parsedData.height = dimensions[1];
		
		return true;
	};
	
	// Handle data returned from a request
	Provider.prototype.onJson = function(data, anchor, options) {
		var parsedData = this.parseData(data);
		if(this.validateData(parsedData, options)) {
			this.render(parsedData, anchor, data, options);
		}
		return parsedData;
	};
	
	Provider.prototype.render = function(parsedData, anchor, data, options) {
		//log(parsedData);
	};
	
	// Flickr extends Provider
	function Flickr(id, urlSchemeStart) {
		Provider.call(this, id, urlSchemeStart);
		//this.apiEndPoint = 'http://flickr.com/services/oembed/';
	}
	extend(Provider, Flickr);
	
	// Specialises parseData to look for the image url
	Flickr.prototype.parseData = function(data) {
		var parsedData = this.super_.parseData.call(this, data);
		parsedData.url = data.url;
		return parsedData;
	};
	
	// Specialise render to show image
	Flickr.prototype.render = function(parsedData, anchor, data, options) {
		anchor.replaceWith(
			'<img width="' + parsedData.width + '" height="' + parsedData.height + '" src="' + parsedData.url + '"/>'
		);
	};
	
	// VideoProvider extends Provider
	function VideoProvider(id, urlSchemeStart) {
		Provider.call(this, id, urlSchemeStart);
	}
	extend(Provider, VideoProvider);
	
	// Specialises parseData to look for html
	VideoProvider.prototype.parseData = function(data) {
		var parsedData = this.super_.parseData.call(this, data);
		
		parsedData.flashSrc = undefined;
		
		// If data has an html property and it is a Flash object/embed element
		if(data.html && data.html.match(/^<(?:object|embed).*?type=(?:\"|')application\/x-shockwave-flash(?:\"|')/i) !== null) {
			// Set the flash src to be the src/data attribute
			parsedData.flashSrc = data.html.match(/^<(?:object|embed).*?(?:src|data)=(?:"|')([^'"]*?)(?:"|')/i)[1];
		}
		return parsedData;
	};
	
	// Video specialised render
	VideoProvider.prototype.render = function(parsedData, anchor, data, options) {
	
		if(swfobject && swfobject.hasFlashPlayerVersion(FLASH_VERSION_REQUIRED)) {
		
			// Get reference to anchor id, create if necessary
			var uid = anchor.attr('id') === '' ? Math.random().toString().replace(/^0\./,'jquery_embedlinks_') : anchor.attr('id');
			anchor.attr('id', uid);
			
			// Extract any params found in the data
			var extractedParams = {};
			var paramTags = data.html.match(/<param name=(?:'|").*?(?:'|")\s+?value=(?:'|").*?(?:'|")/gi);
			if(paramTags !== null) {
				$.each(paramTags, function(i, paramTag) {
					var matchedParamTag = paramTag.match(/<param name=(?:'|")(.*?)(?:'|")\s+?value=(?:'|")(.*?)(?:'|")/i);
					extractedParams[matchedParamTag[1]] = matchedParamTag[2];
				});
			}
			
			// If querystring params in options, add these to flash url
			var qsObj = options[this.id + "_querystring"];
			var flashSrc = parsedData.flashSrc;
			if(qsObj !== undefined) {
				// Add initial ? unless already a qs, then add &
				flashSrc += (flashSrc.match(/\?/) === null) ? "?" : "&";
				$.each(qsObj, function(name, value) {
					flashSrc += name + "=" + value + "&";
				});
				// Remove superfluous &
				flashSrc = flashSrc.replace(/&$/,'');
			}
			
			// Embed the swf
			swfobject.embedSWF(
				flashSrc,
				uid,
				parsedData.width + '',
				parsedData.height + '',
				FLASH_VERSION_REQUIRED,
				null,
				null,
				extractedParams,
				// todo: why the next line?
				{id:uid + '_id'}
			);
		}
	};
	
	
	
	
	// Provider instances
	var providers = [
		new VideoProvider('youtube', 'http://www.youtube.com/watch?v='),
		new VideoProvider('vimeo', 'http://vimeo.com/'),
		new Flickr('flickr', 'http://www.flickr.com/photos/'),
		new VideoProvider('qik', 'http://qik.com/')
	];
	
	// Match a provider to the passed url
	var getProvider = function(url) {
		for(var i = 0 ; i < providers.length ; i++) {
			if(providers[i].handlesUrl(url)) {
				return providers[i];
			}
		}
		return null;
	};
	
	/*
	Plugin
	*/
	$.fn.embedLinks = function(options) {
		return this.each(function() {
			if(this.nodeName === 'A') {
				var anchor = $(this);
				var provider = getProvider(anchor.attr('href'));
				if(provider !== null) {
					provider.embedLink(anchor, options);
				}
			}
		});
	
	};
	
	/*
	Function, called with $.emedLinks([options])
	*/
	$.embedLinks = function(options) {
		var cssPath = '';
		$.each(providers, function(i, provider) {
			cssPath += 'a[href^=' + provider.urlSchemeStart + ']';
			if(i < providers.length - 1) {
				cssPath += ',';
			}
		});
		$(cssPath).embedLinks(options);
	};
})(jQuery);








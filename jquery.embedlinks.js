/*
http://code.google.com/p/jquery-embedlinks/
*/
 
/*jslint browser: true, rhino: true, newcap: true */

 /*globals jQuery, swfobject, window, escape */

/*
Todo: Providers to have an additional param with less amiguous url scheme, to 
      test against hrefs and reduce unnecessay requests
Todo: Specialise YouTube and Vimeo providers (see todo below)
Todo: Other endpoints
Todo: Default options should default to no max and no min width
Todo: Turn these todos into tickets
*/

(function($) {

	// Constants
	var FLASH_VERSION_REQUIRED = "9.0.0";
	
	// Default properties
	var defaultOptions = {
		maxwidth: 800,
		maxheight: 800
	};

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
	function Provider(urlSchemeStart) {
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
	Provider.prototype.validateData = function(parsedData) {
		for(var property in parsedData) {
			if(parsedData.hasOwnProperty(property)) {
				var value = parsedData[property];
				if((typeof value === "number" && isNaN(value)) || typeof value === "undefined") {
					return false;
				}
			}
		}
		return true;
	};
	
	// Handle data returned from a request
	Provider.prototype.onJson = function(data, anchor, options) {
		var parsedData = this.parseData(data);
		if(this.validateData(parsedData)) {
			this.render(parsedData, anchor, data, options);
		}
		return parsedData;
	};
	
	Provider.prototype.render = function(parsedData, anchor, data, options) {
		//log(parsedData);
	};
	
	// Flickr extends Provider
	function Flickr(urlSchemeStart) {
		Provider.call(this, urlSchemeStart);
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
			'<img width="' + Math.min(parsedData.width, options.maxwidth) + '" height="' + Math.min(parsedData.height, options.maxheight) + '" src="' + parsedData.url + '"/>'
		);
	};
	
	// VideoProvider extends Provider
	function VideoProvider(urlSchemeStart) {
		Provider.call(this, urlSchemeStart);
	}
	extend(Provider, VideoProvider);
	
	// Specialises parseData to look for thumbnail_url and html
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
			
			// Embed the swf
			swfobject.embedSWF(
				parsedData.flashSrc, 
				uid,
				Math.min(parsedData.width, options.maxwidth) + '',
				Math.min(parsedData.height, options.maxheight) + '',
				FLASH_VERSION_REQUIRED,
				null,
				null,
				extractedParams,
				{id:uid + '_id'}
			);
		}
		// If Flash is not available, anchor wraps thumbnail, at width and 
		// height of movie
		else {
			// Todo: specialise this for YouTube and Vimeo, Qik doesn't supply a thumbnail
			//anchor.html('<img width="' + parsedData.width + '" height="' + parsedData.height + '" src="' + parsedData.thumbnail_url + '"/>');
		}
	};
	
	
	
	// Provider instances
	var providers = [
		// YouTube
		new VideoProvider('http://www.youtube.com/watch?v='),
		// Vimeo
		new VideoProvider('http://vimeo.com/'),
		// flickr
		new Flickr('http://www.flickr.com/photos/'),
		// Qik
		new VideoProvider('http://qik.com/')
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
					console.log("Provider");
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








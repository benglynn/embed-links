/*

About
WORK IN PROGRESS

Replaces anchors pointing to certain media with embedded media. The media must 
be hosted with a proider that supports the oEmbed format http://www.oembed.com/, 
as the provider is queried via an ajax request to glean the necessary data.

 * The raw html returned by the provider is not used directly, html is 
 consturcted from the metadata.
 
 * Where Flash is required, SWFObject http://code.google.com/p/swfobject/ is 
 used to perform Flash detection and embed the media.
   
 * If Flash is unavailable (either because SWFObject is unavailable of because 
 the system does not have Flash -- iPhone for example) then the video's 
 thumbnail (if available) is wrapped in a link to the video on the provider's 
 site.

 * A function is available which will identify anchors pointing to supported 
 media. (Alternatively, oembed can be called on a jQuery object.)
 
 * The code passes the JSLint code quality tool http://www.jslint.com/
 
 This plugin was developed by benglynn, the oEmbed ajax inspired by the jquery.
 oembed plugin http://plugins.jquery.com/project/jquery-oembed
 
 */
 
/*jslint browser: true, rhino: true, newcap: true */
 /*globals jQuery, window, escape */

/*
Todo: Redo matching of oembed formats. Deal with different url schemes, e.g:
http://flickr.com/photos vs http://www.flickr.com/photos, or no trailing slash
etc.
*/

(function($) {

	// Constants
	var FLASH_VERSION_REQUIRED = 8;
	
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
		else if(window.console) {
			console.log(arguments[0].toString());
		}
	}
	
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
			provider.onJson(data, anchor);
		});
	};
	
	// Parse data for properties necessry for embed. Width and height are common
	// to all media.
	Provider.prototype.parseData = function(data) {
		var parsedData = {};
		parsedData.width = parseInt(data.width);
		parsedData.height = parseInt(data.height);
		return parsedData;
	}
	
	// Validate parsed data, failing on any NaN numbers or undefined values
	Provider.prototype.validateData = function(parsedData) {
		for(var property in parsedData) {
			var value = parsedData[property];
			if((typeof value === "number" && isNaN(value)) || typeof value === "undefined") {
				return false;
			}
		}
		return true;
	}
	
	// Handle data returned from a request
	Provider.prototype.onJson = function(data, anchor) {
		var parsedData = this.parseData(data);
		if(this.validateData(parsedData)) {
			this.render(parsedData, anchor);
		}
		return parsedData;
	};
	
	Provider.prototype.render = function(parsedData, anchor) {
		console.log(parsedData);
	}
	
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
	}
	
	// Specialise render to show image
	Flickr.prototype.render = function(parsedData, anchor) {
		anchor.replaceWith(
			'<img width="' + parsedData.width + '" height="' + parsedData.height + '" src="' + parsedData.url + '"/>'
		);
	};
	
	// VideoProvider extends Provider
	function VideoProvider(urlSchemeStart) {
		Provider.call(this, urlSchemeStart);
	}
	extend(Provider, VideoProvider);
	
	// Specialises parseData to look for thumbnail_url
	VideoProvider.prototype.parseData = function(data) {
		var parsedData = this.super_.parseData.call(this, data);
		parsedData.thumbnail_url = data.thumbnail_url;
		return parsedData;
	}
	
	// Video specialised render
	VideoProvider.prototype.render = function(parsedData, anchor) {
		anchor.html(
			'<img width="' + parsedData.width + '" height="' + parsedData.height + '" src="' + parsedData.thumbnail_url + '"/>'
		);
	};
	
	// Provider instances
	var providers = [
		// YouTube
		new VideoProvider('http://www.youtube.com/watch?v='),
		// Vimeo
		new VideoProvider('http://vimeo.com/'),
		// flickr
		new Flickr('http://www.flickr.com/photos/')
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








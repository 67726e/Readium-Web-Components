EpubReader.LoadStrategy = Backbone.Model.extend({

    defaults : {
        "numFixedPagesPerView" : 100
    },

    initialize : function (attributes, options) {},

	getSpineIndexForUrl : function(targetUrl, currentUrl) {
		var spineIndex = -1;

		var currentUri = new URI(currentUrl);
		var targetUri = new URI(targetUrl);
		var targetUrl = targetUri.absoluteTo(currentUri).toString();

		for (var i = 0; i < this.attributes.spineInfo.length; i++) {
			var spineItem = this.attributes.spineInfo[i];
			var contentDocumentURI = spineItem.contentDocumentURI;

			if (contentDocumentURI === targetUrl) {
				spineIndex = spineItem.spineIndex;
				break;
			}
		}

		return spineIndex;
	},

	generateLinkClickCallback: function(currentUrl) {
		// Ensure the callback is executed in the context of `this`
		return $.proxy(function(event) {
			event.preventDefault();

			var $target = $(event.currentTarget);
			// Split on `#` to remove the possible ID in the URL
			var urlParts = $target.attr("href").split("#");
			var targetUrl = urlParts[0];
			var targetId = urlParts[1];
			var uri = new URI(targetUrl);

			// Only try to validate a link if the target element has an href
			if (typeof targetUrl === "string") {
				// We're assuming that a relative URL means an internal link to another spine item
				// We should probably open absolute URLs in a new tab
				if (uri.is("relative")) {
					var spineIndex = this.getSpineIndexForUrl(targetUrl, currentUrl);

					if (spineIndex >= 0) {
						if (targetId) {
							return epubReaderView.showPageByElementId(spineIndex, targetId, function() {}, this);
						} else {
							return epubReaderView.showSpineItem(spineIndex, function() {}, this);
						}
					}
				}

				return window.open(targetUrl, "_blank");
			}

			return undefined;
		}, this);
	},

    // Description: This method chooses the appropriate page view to load for individual 
    //   spine items, and sections of the spine. 
    loadSpineItems : function (viewerSettings, annotations, bindings) {

        var spineIndex;
        var currSpineItem;
        var currFixedSpineItems = [];
        var nextSpineItem;
        var pagesViews = [];
        var currPageView;
        var nextSpineItem;
        for (spineIndex = 0; spineIndex <= this.get("spineInfo").length - 1; spineIndex++) {

            currSpineItem = this.get("spineInfo")[spineIndex];

            // A fixed layout spine item
            if (currSpineItem.isFixedLayout) {

                currFixedSpineItems.push(currSpineItem);

                // Check how many fixed pages have been added for the next view
                if (currFixedSpineItems.length === this.get("numFixedPagesPerView")) {

                    currPageView = this.loadFixedPagesView(currFixedSpineItems, viewerSettings);
                    pagesViews.push(currPageView);
                    currFixedSpineItems = [];
                    continue;
                }

                nextSpineItem = this.get("spineInfo")[spineIndex + 1];
                if (nextSpineItem) {

                    if (!nextSpineItem.isFixedLayout) {

                        currPageView = this.loadFixedPagesView(currFixedSpineItems, viewerSettings);
                        pagesViews.push(currPageView);
                        currFixedSpineItems = [];
                    }
                }
                else {
                    currPageView = this.loadFixedPagesView(currFixedSpineItems, viewerSettings);
                    pagesViews.push(currPageView);
                    currFixedSpineItems = [];
                }
            }
            // A scrolling spine item 
            else if (currSpineItem.shouldScroll) {

                // Load the scrolling pages view
            }
            // A reflowable spine item
            else {
                currPageView = this.loadReflowablePagesView(currSpineItem, viewerSettings, annotations, bindings);
                pagesViews.push(currPageView);
            }
        }

        return pagesViews;
    },

    loadReflowablePagesView : function (spineItem, viewerSettings, annotations, bindings) {
		var view = new EpubReflowableModule(
            spineItem,
            viewerSettings, 
            annotations, 
            bindings,
			$.proxy(this.generateLinkClickCallback(spineItem.contentDocumentURI), this)
        );

        var pagesViewInfo = {
            pagesView : view, 
            spineIndexes : [spineItem.spineIndex],
            isRendered : false,
            type : "reflowable"
        };

        return pagesViewInfo;
    },

    loadFixedPagesView : function (spineItemList, viewerSettings) {
        var view = new EpubFixedModule(
            spineItemList,
            viewerSettings,
			$.proxy(this.generateLinkClickCallback, this)
        );

        var spineIndexes = [];
        _.each(spineItemList, function (spineItem) {
            spineIndexes.push(spineItem.spineIndex)
        });

        var pagesViewInfo = {
            pagesView : view, 
            spineIndexes : spineIndexes,
            isRendered : false,
            type : "fixed"
        };

        return pagesViewInfo;
    }
});

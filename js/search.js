function humanize(str) {
  return str.replace(/_/g, ' ')
      .replace(/(\w+)/g, function(match) {
        return match.charAt(0).toUpperCase() + match.slice(1);
      });
};

var lunrIndex, $results, pagesIndex;

// Initialize lunrjs using our generated index file
function initLunr() {
    // First retrieve the index file - TODO - infer whether this is local or hosted
    $.getJSON("/js/index.json")
        .done(function(index) {
            pagesIndex = index;
            // Set up lunrjs by declaring the fields we use
            // Also provide their boost level for the ranking
            lunrIndex = lunr(function() {
                this.field("title", {
                    boost: 10
                });
                this.field("tags", {
                    boost: 5
                });
                this.field("content");
                this.field("categories", {
                    boost: 5
                });
                this.field("date");
                this.field("author");
                this.ref("uri");
            });

            // Feed lunr with each file and let lunr actually index them
            pagesIndex.forEach(function(page) {
                lunrIndex.add(page);
            });
        }).done(function() {
            $(document).ready(function() {
                initUI();
            });
        })
        .fail(function(jqxhr, textStatus, error) {
            var err = textStatus + ", " + error;
            console.error("Error getting Hugo index flie:", err);
        });
}

//Get GET parameter from searcb
function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');

    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');

        if (pair[0] === variable) {
            return decodeURIComponent(pair[1].replace(/\+/g, '%20'));
        }
    }
}

// Nothing crazy here, just hook up a listener on the input field
function initUI() {
    $searchResults = $("#search-results");
    var searchTerm = getQueryVariable('query');
    if (searchTerm) {
        $searchResults.empty();
        var results = search(searchTerm);
        if(results.length > 0){
            renderResults(results);
        }
        else {
            $searchResults.append('<h2 class="text-center">Sorry! Your search yielded no results.</h2>');
        }
    }
    else {
        $searchResults.empty();
        $searchResults.append('<h2 class="text-center">Sorry! Please enter in search criteria.</h2>');
    }
}

/**
 * Trigger a search in lunr and transform the result
 *
 * @param  {String} query
 * @return {Array}  results
 */
function search(query) {
    // Find the item in our index corresponding to the lunr one to have more info
    // Lunr result: 
    //  {ref: "/section/page1", score: 0.2725657778206127}
    // Our result:
    //  {title:"Page1", href:"/section/page1", ...}
    //TODO - this processing should really be pre processing and stored in a JSON file with map structure
    var pagesIndexMap = pagesIndex.reduce(function(map, obj) {
        //TODO - fix this hacky addition of posts, probably on how hugo-lunr is being used
        map[obj.uri] = {"content": obj.content, "title": obj.title, "tags": obj.tags, "categories": obj.categories, "date": obj.date, "author": obj.author, "uri": "/post" + obj.uri};
        return map;
    }, {});

    var finalResults = [];
    var lunrResults = lunrIndex.search(query);
    for (var i = 0; i<lunrResults.length; i++) {
        finalResults.push(pagesIndexMap[lunrResults[i].ref]);
    }

    return finalResults;
}

/**
 * Display the 10 first results
 *
 * @param  {Array} results to display
 */
function renderResults(results) {
    if (!results.length) {
        return;
    }
    // Only show the ten first results
    results.slice(0, 10).forEach(function(result) {
        var htmlResult = [];
        htmlResult.push('<article class="post"><header class="post-header"><h2 class="post-title">');
        htmlResult.push('<a href="' + result.uri + '">' + result.title + '</a>');

        //TODO - this is a hacky way of recreating the summary feature
        htmlResult.push('</h2></header><section class="post-excerpt"><p>' + result.content.split(/\s+/).slice(0,70).join(" "));
        htmlResult.push('<a class="read-more" href="' + result.uri + '">&raquo;</a></p></section><footer class="post-meta">');

        if(result.categories.length >0) {
            for(var i=0;i<result.categories.length; i++){
                if(i == (result.categories.length - 1)){
                    htmlResult.push('<a href="/categories/' + result.categories[i] + '/">' + humanize(result.categories[i]) + '</a>');
                }
                else {
                    htmlResult.push('<a href="/categories/' + result.categories[i] + '/">' + humanize(result.categories[i]) + '</a>,');
                }
            }
        }

        if(result.tags.length >0) {
            for(var i=0;i<result.tags.length; i++){
                if(i == (result.tags.length - 1)){
                    htmlResult.push('<a href="/tags/' + result.tags[i] + '/">' + humanize(result.tags[i]) + '</a>');
                }
                else {
                    htmlResult.push('<a href="/tags/' + result.categories[i] + '/">' + humanize(result.tags[i]) + '</a>,');
                }
            }
        }

        htmlResult.push('<time class="post-date" datetime="' + result.date + '">' + dateFormat(result.date, 'd mmm yyyy') + '</time>');
        htmlResult.push('</footer></article>');
        $searchResults.append(htmlResult.join(''));
    });
}

//This loads the JSON, checks to make sure the DOM is ready, then returns the search results
initLunr();

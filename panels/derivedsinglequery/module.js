/*

  ## Termsquery

  Broadcasts an array of queries based on the results of a terms facet

  ### Parameters
  * label :: The label to stick over the field 
  * query :: A string to use as a filter for the terms facet
  * field :: the field to facet on
  * size :: how many queries to generate
  * fields :: a list of fields known to us
  
  ### Group Events
  #### Sends
  * query :: Always broadcast as an array, even in multi: false
  * get_time :: Request the time object from the timepicker
  #### Receives
  * query :: An array of queries. This is probably needs to be fixed.
  * time :: populate index and time
  * fields :: A list of fields known to us
*/

angular.module('kibana.derivedsinglequery', [])
.controller('derivedsinglequery', function($scope, eventBus) {

  // Set and populate defaults
  var _d = {
    label   : "Select",
    query   : "*",
    group   : "default",
    field   : '_type',
    spyable : true,
    size    : 5,
    exclude : []
  }
  _.defaults($scope.panel,_d);

  $scope.init = function() {

     $scope.derived_queries = [];


    eventBus.register($scope,'filter', function(event,filter, routing){
        if (_.isUndefined($scope._filters)) $scope._filters = {};
        if (filter) {
            $scope._filters[routing.from] = filter;
        }
        else {
            delete $scope._filters[routing.from];
        }
        $scope.get_data();
    });

     eventBus.register($scope,'time', function(event,time){ $scope.set_time(time)});


     eventBus.broadcast($scope.$id,$scope.panel.group,'get_filters')
     eventBus.broadcast($scope.$id,$scope.panel.group,'get_time')
  }

    $scope.set_time = function(time) {
        $scope.time = time;
        $scope.index = time.index || $scope.index
        $scope.get_data();
    }

  $scope.get_data = function() {
    // Make sure we have everything for the request to complete
    if(_.isUndefined($scope.index) || _.isUndefined($scope._filters))
      return

    $scope.panel.loading = true;
    var request = $scope.ejs.Request().indices($scope.index);

    // combine filters
    var ejsFilter = ejs.AndFilter([]);

    for (var f in $scope._filters) {
        ejsFilter.filters($scope._filters[f]);
    }

    // Terms mode
    request = request
      .facet(ejs.TermsFacet('query')
        .field($scope.panel.field)
        .size($scope.panel.size)
        .exclude($scope.panel.exclude)
        .facetFilter(ejs.QueryFilter(
          ejs.FilteredQuery(
            ejs.QueryStringQuery($scope.panel.query || '*'),
            ejsFilter))));

    $scope.populate_modal(request);

    var results = request.doSearch();

    // Populate scope when we have results
    results.then(function(results) {
      $scope.panel.loading = false;
      var data = [];
      _.each(results.facets.query.terms, function(v) {
        data.push(v.term)
      });
      $scope.derived_queries = data
    });
  }

  $scope.set_refresh = function (state) { 
    $scope.refresh = state; 
  }

  $scope.close_edit = function() {
    if($scope.refresh)
      $scope.get_data();
    $scope.refresh =  false;
  }

  $scope.populate_modal = function(request) {
    $scope.modal = {
      title: "Inspector",
      body : "<h5>Last Elasticsearch Query</h5><pre>"+
          'curl -XGET '+config.elasticsearch+'/'+$scope.index+"/_search?pretty -d'\n"+
          angular.toJson(JSON.parse(request.toString()),true)+
        "'</pre>", 
    } 
  }


  $scope.send_query = function() {
    eventBus.broadcast($scope.$id,$scope.panel.group,'query',$scope.panel.field + ":" +$scope.selected_query)
  }



});

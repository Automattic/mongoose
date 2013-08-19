
// this file contains all the graphing logic for the benchmark graphs


$("document").ready(function () {
  $.getJSON('data.json', function (jsonData) {
    var data = jsonData.data;
    var charts = jsonData.charts;
    // loop over the charts and create them
    for (var i=0; i < charts.length; i++) {
      var chartDesc = charts[i];
      var chartData = data[i];
      var container = "div.hero-unit";

      $("<a></a>").attr("name", i.toString()).appendTo(container);
      $("<div></div>").addClass("gContainer").attr("id", "div"+i).appendTo(container);
      var selector = "#div%id%".replace("%id%",i.toString());
      switch(chartDesc.type) {
        case "singleBar":
          buildBarGraph(selector, chartDesc, chartData);
          break;
        case "multiBar":
          buildMultiBarGraph(selector, chartDesc, chartData);
          break;
        case "line":
          buildLineGraph(selector, chartDesc, chartData);
          break;
      }

    }
  }).error(function (err) {
    console.log(err);
  });;
});

function buildBarGraph(selector, chartDesc, chartData) {

  $("<h1 class='chartTitle'>%title%</h1>".replace("%title%",chartDesc.title))
    .appendTo(selector);

  var xData = chartData.map(function (item) {
    return item.x;
  });
  var yData = chartData.map(function (item) {
    return item.y;
  });

  var w = 100,
      h = 400;

  var x = d3.scale.linear()
    .domain([0, 1])
    .range([0, w]);

  var y = d3.scale.linear()
    .domain([0, d3.max(yData) * 1.25])
    .rangeRound([0,h]);


  var totalWidth = w * chartData.length - 1;

  // create the chart
  var chart = d3.select(selector).append("svg")
    .attr("class", "chart")
    .attr("width", totalWidth + 50)
    .attr("height", h + 50)
    .append("g").attr("transform", "translate(10,15)");

  // add the data rectangles (these are the bars)
  chart.selectAll("rect").data(chartData).enter().append("rect")
    .attr("x", function(d, i) { return x(i) - .5; })
    .attr("y", function(d, i) { return h - y(d.y) - .5; })
    .attr("width", w * .75)
    .attr("height", function(d) { return y(d.y); });

  // add the labels for each bar (essentially their x-value)
  chart.selectAll("text").data(chartData).enter().append("text")
    .attr("x", function(d, i) { return i * w + (w*.75/2); })
    .attr("y", h - 10)
    .attr("dx", -3)
    .attr("text-anchor", "middle")
    .text(function(d) { return d.x; });

  // add the value labels for each bar (essentially their y-value)
  chart.selectAll(".value").data(chartData).enter().append("text")
    .attr("class", "value")
    .attr("x", function(d, i) { return i * w + (w*.75/2); })
    .attr("y", function(d, i) { return h - y(d.y) - 5; })
    .attr("dx", -3)
    .attr("text-anchor", "middle")
    .text(function(d) { return d.y; });

  // add horizontal lines for scale
  chart.selectAll("line").data(y.ticks(10)).enter().append("line")
    .attr("x1", 0)
    .attr("x2", totalWidth - (w * .25) + 3)
    .attr("y1", y)
    .attr("y2", y)
    .style("stroke", "#ccc");

  // add the scale labels
  chart.selectAll(".rule").data(y.ticks(10)).enter().append("text")
    .attr("class", "rule")
    .attr("y", function(d,i) { return h - y(d);})
    .attr("x", totalWidth)
    .attr("dx", -(w/15))
    .attr("dy", 6)
    .attr("text-anchor", "middle")
    .text(String);

  // add a line at the base
  chart.append("line")
    .attr("x1", 0)
    .attr("x2", totalWidth - (w * .25) + 3)
    .attr("y1", h - .5)
    .attr("y2", h - .5)
    .style("stroke", "#000");

}

function buildMultiBarGraph(selector, chartDesc, chartData) {

  $("<h1 class='chartTitle'>%title%</h1>".replace("%title%",chartDesc.title))
    .appendTo(selector);

  // get all of the keys that are actual values (ie. everything except x)
  var valKeys = d3.keys(chartData[0]).filter(function (key) {
    return key !== "x";
  });

  var margin = { top : 20, right : 20, bottom : 30, left : 40 };
  // make sure the graph is at least 960px, but have it scale based on the
  // number of entries
  var width = d3.max([(valKeys.length * chartData.length * 16), 960]) - margin.left - margin.right;
  var height = 500 - margin.top - margin.bottom;

  var x0 = d3.scale.ordinal().rangeRoundBands([0, width], .1);
  var x1 = d3.scale.ordinal();

  var y = d3.scale.linear().range([height, 0]);

  var color = d3.scale.category20();

  var xAxis = d3.svg.axis().scale(x0).orient("bottom");
  var yAxis = d3.svg.axis().scale(y).orient("left").tickFormat(d3.format(".2s"));

  // create the graph
  var graph = d3.select(selector).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // this just makes later manipulation of the data easier
  var l = chartData.length;
  for (var i=0; i < l; i++) {
    chartData[i].values = valKeys.map(function (key) {
      return chartData[i][key];
    });
  }

  // get the names of the individual bars
  var barNames = chartData[0].values.map(function (item) {
    return item.name;
  });

  var commits = chartData.map(function (item) {
    return item.x;
  });

  // the groups are based off of the x key
  x0.domain(commits);

  // the names of the individual bars are based off of the name property on
  // each of the values
  x1.domain(barNames).rangeRoundBands([0, x0.rangeBand()]);

  // get the maximum value out of any item in the set
  y.domain([0, d3.max(chartData, function (data) {
    return d3.max(data.values, function (item) {
      return item.val * 1.30;
    });
  })]);

  // add the x-axis
  graph.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height +")")
    .call(xAxis);

  // this is the thing we have to do to add links to commit names
  graph.selectAll("g.x.axis g text").each(function (d, i) {
    var g = d3.select(this);
    g.attr("fill", "blue");
    var text = g.text().split('|');
    g.text('');
    g.append("a")
      .attr("xlink:href", text[1])
      .text(text[0]);
  });

  // add the y-axis
  graph.append("g")
    .attr("class", "y axis")
    .call(yAxis)
  .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text(chartDesc.yLabel)

  // add the groups
  var group = graph.selectAll(".group")
    .data(chartData).enter().append("g")
    .attr("class", "g")
    .attr("transform", function (d) {
      return "translate(" + x0(d.x) + ",0)";
    });

  // add the bars to the groups
  group.selectAll("rect")
    .data(function (d) {
      return d.values;
    }).enter().append("rect")
      .attr("width", x1.rangeBand())
      .attr("x", function(d) { return x1(d.name); })
      .attr("y", function(d) { return y(d.val); })
      .attr("height", function (d) { return height - y(d.val); })
      .style("fill", function(d) { return color(d.name); });

  var legend = graph.selectAll(".legend")
    .data(barNames).enter().append("g")
    .attr("class", "legend")
    .attr("transform", function (d, i) {
      return "translate(20," + (i*20) + ")";
    });

  legend.append("rect")
    .attr("x", width - 18)
    .attr("width", 18)
    .attr("height", 18)
    .style("fill", color);

  legend.append("text")
    .attr("x", width -24)
    .attr("y", 9)
    .attr("dy", ".35em")
    .style("text-anchor", "end")
    .text(function(d) { return d; });

  // add the axis label
  graph.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", 6)
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    .text(chartDesc.units);

}

function buildLineGraph(selector, chartDesc, chartData) {

  $("<h1 class='chartTitle'>%title%</h1>".replace("%title%", chartDesc.title))
    .appendTo(selector);

  var margin = { top : 20, right : 20, bottom : 30, left : 40 };
  // make sure the graph is at least 960px, but have it scale based on the
  // number of entries
  var width = d3.max([(chartData.length * 50), 960]) - margin.left - margin.right;
  var height = 500 - margin.top - margin.bottom;

  var xVals = chartData.map(function (item) {
    return item.x;
  });

  var keys = Object.keys(chartData[0]);
  var lineData = {};
  var max = -1;
  var lineNames = [];
  for (var i=0; i < keys.length; i++) {
    var k = keys[i];
    if (k == "x") continue;
    lineData[k] = chartData.map(function (item) {
      return item[k];
    });
    lineNames.push(k);
    max = d3.max([max, d3.max(lineData[k])]);
  }
  var x = d3.scale.ordinal()
    .rangePoints([0, width], .1)
    .domain(xVals);


  var y = d3.scale.linear().range([height, 0]).domain([0, max]);

  var line = d3.svg.line()
    .x(function (d, i) {
      return x(i);
    })
    .y(function (d) {
      return y(d);
    });

  // create the graph
  var graph = d3.select(selector).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var xAxis = d3.svg.axis().scale(x).tickSize(-height).tickSubdivide(true);
  graph.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  // this is the thing we have to do to add links to commit names
  graph.selectAll("g.x.axis g text").each(function (d, i) {
    var g = d3.select(this);
    g.attr("fill", "blue");
    var text = g.text().split('|');
    g.text('');
    g.append("a")
      .attr("xlink:href", text[1])
      .text(text[0]);
  });

  var yAxis = d3.svg.axis()
    .scale(y)
    .ticks(10)
    .orient("left")
    .tickFormat(d3.format(".2s"));

  graph.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(-5, 0)")
    .call(yAxis);

  var color = d3.scale.category20();

  // add the lines
  for (var i=0; i < lineNames.length; i++) {
    var k = lineNames[i];
    graph.append("path").attr("d", line(lineData[k]))
      .attr("stroke", function (d, i) {
        return color(k);
      });
    // add dots to represent the actual data
    graph.selectAll('circle.' + k)
      .data(lineData[k]).enter()
      .append('circle')
      .attr('class', k)
      .attr('cx', function(d, i) { return x(i); })
      .attr('cy', function(d) { return y(d); })
      .attr('r', 3)
      .style('fill', function (d, i) {
        return color(k);
      });


  }

  // build the legend


  var legend = graph.append("g").attr("transform", "translate(30,0)")
    .selectAll(".legend")
    .data(lineNames).enter().append("g")
    .attr("class", "legend")
    .attr("transform", function (d, i) {
      return "translate(20, " + (i*20) + ")";
    });

  legend.append("circle")
    .attr("x", 18)
    .attr("r", 5)
    .style("fill", function (d) {
      return color(d);
    });

  legend.append("text")
    .attr("x", 15)
    .attr("dy", ".35em")
    .style("text-anchor", "start")
    .text(function(d) { return d; });

  // add the axis label
  graph.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", 6)
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    .text(chartDesc.units);

}

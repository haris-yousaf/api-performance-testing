/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 99.79692554723843, "KoPercent": 0.20307445276157643};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9694443788519209, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "GET Single Post"], "isController": false}, {"data": [0.9174533323869686, 500, 1500, "Create Post"], "isController": false}, {"data": [0.9907525060002824, 500, 1500, "GET All Posts"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 42349, 86, 0.20307445276157643, 208.41996269097274, 5, 21347, 70.0, 441.0, 596.0, 905.0, 366.71515907240956, 3783.115558931803, 67.29214293136593], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["GET Single Post", 14094, 0, 0.0, 27.242230736483634, 5, 419, 19.0, 60.0, 74.25, 109.04999999999927, 122.88028457588254, 181.2004366668265, 16.80003890685894], "isController": false}, {"data": ["Create Post", 14089, 0, 0.0, 413.40520973809214, 323, 1493, 358.0, 605.0, 693.5, 898.3000000000011, 122.05665771463224, 160.59569043467903, 34.09016151563718], "isController": false}, {"data": ["GET All Posts", 14166, 86, 0.6070873923478752, 184.8058026260051, 23, 21347, 67.0, 142.0, 177.0, 1051.0, 123.47142446243822, 3465.158012614834, 16.63970368732078], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["The operation lasted too long: It took 21,065 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 7,059 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,087 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,171 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,249 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,214 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,050 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,142 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,072 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,085 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,063 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,056 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,347 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,111 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,130 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,164 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,059 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, 2.3255813953488373, 0.004722661692129685], "isController": false}, {"data": ["The operation lasted too long: It took 15,076 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, 2.3255813953488373, 0.004722661692129685], "isController": false}, {"data": ["The operation lasted too long: It took 15,065 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,098 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,091 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,080 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,056 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,106 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,193 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,143 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,067 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,128 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,201 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,110 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, 2.3255813953488373, 0.004722661692129685], "isController": false}, {"data": ["The operation lasted too long: It took 7,042 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,123 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,088 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,287 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,086 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,099 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,107 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,219 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,120 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 7,054 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,108 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,080 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,061 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, 2.3255813953488373, 0.004722661692129685], "isController": false}, {"data": ["The operation lasted too long: It took 21,165 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,083 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,096 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,067 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, 2.3255813953488373, 0.004722661692129685], "isController": false}, {"data": ["The operation lasted too long: It took 15,045 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,100 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 7,062 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, 2.3255813953488373, 0.004722661692129685], "isController": false}, {"data": ["The operation lasted too long: It took 15,077 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,086 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,139 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,163 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,084 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,055 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,048 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,125 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,059 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,103 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,114 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,072 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, 2.3255813953488373, 0.004722661692129685], "isController": false}, {"data": ["The operation lasted too long: It took 21,085 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 7,068 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,058 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, 2.3255813953488373, 0.004722661692129685], "isController": false}, {"data": ["The operation lasted too long: It took 7,058 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,215 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,084 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 15,060 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, 2.3255813953488373, 0.004722661692129685], "isController": false}, {"data": ["The operation lasted too long: It took 15,068 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,073 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, 2.3255813953488373, 0.004722661692129685], "isController": false}, {"data": ["The operation lasted too long: It took 15,071 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,137 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, 2.3255813953488373, 0.004722661692129685], "isController": false}, {"data": ["The operation lasted too long: It took 21,140 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}, {"data": ["The operation lasted too long: It took 21,115 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 1.1627906976744187, 0.0023613308460648423], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 42349, 86, "The operation lasted too long: It took 15,059 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, "The operation lasted too long: It took 15,076 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, "The operation lasted too long: It took 15,110 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, "The operation lasted too long: It took 21,061 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, "The operation lasted too long: It took 15,067 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["GET All Posts", 14166, 86, "The operation lasted too long: It took 15,059 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, "The operation lasted too long: It took 15,076 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, "The operation lasted too long: It took 15,110 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, "The operation lasted too long: It took 21,061 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2, "The operation lasted too long: It took 15,067 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 2], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});

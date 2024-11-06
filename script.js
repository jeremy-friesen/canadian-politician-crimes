const sheetId = '1gof45QUi2p0f8YVaKa2fOgtIUBElSueh';
const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

var partyColours = {};
var politicians = {};
var pics = {};

// Function to load the pics.txt file
fetch('pics.txt')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    })
    .then(data => {
        const rows = data.split('\n');
        // const tableBody = document.querySelector('#pics-table tbody');

        rows.forEach(row => {
            if (row.trim()) {
                const columns = row.split(',');
                pics[columns[0]] = 'pics/' + columns[1]
                // tableBody.appendChild(newRow);
            }
        });
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });


fetch('party-colours.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        partyColours = data;
        console.log('party colours: ', partyColours);
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation for party colours:', error);
    });

function getPartyColours(politician, partyText) {
    var keys = Object.keys(partyColours);
    var pColours = [];
    politician['partyCategories'] = []
    var t = partyText;
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (t.includes(k) && !(k == 'Independent' && pColours.length > 0)) {
            pColours.push(partyColours[k]);
            t = t.replace(k, '')
            politician['partyCategories'].push(k)
        }
    }
    return pColours;
}

function getPartyColours2(partyText) {
    var keys = Object.keys(partyColours);
    var pColours = [];
    var t = partyText;
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (t.includes(k) && !(k == 'Independent' && pColours.length > 0)) {
            pColours.push(partyColours[k]);
            t = t.replace(k, '')
        }
    }
    return pColours;
}

fetch(baseUrl)
    .then(response => response.text())
    .then(data => {
        const jsonData = JSON.parse(
            data.substr(47).slice(0, -2)
                .replace('Yellow = In Office', '')
        );
        const cols = jsonData.table.cols;
        const rows = jsonData.table.rows;

        // Populate headers
        cols.forEach((col, index) => {
            const th = document.createElement('th');
            th.textContent = col.label;
            th.onclick = () => sortTable(index, th);
            document.getElementById('header-row').appendChild(th);
        });

        // Populate rows
        rows.forEach(row => {
            const tr = document.createElement('tr');

            // if (row.c[2])
            //     console.log(row.c[2].v)

            if (row.c[0] == null || row.c[0].v === '' || row.c[3] == null || row.c[3].v === '') {
                return;
            }

            var politician = {}
            row.c.forEach((cell, index) => {
                const td = document.createElement('td');

                if (cell)
                    politician[cols[index].label] = cell.v

                // Get the party name
                const partyName = row.c[2] ? row.c[2].v.trim() : '';

                const pColours = getPartyColours(politician, partyName)
                // Set the background color based on the partyColours dictionary
                const color = pColours[pColours.length - 1] || '#4c4c4c';
                const textColour = getContrastingTextColor(color);

                // source
                if (index === 7 && cell.v != null && (cell.v.includes('http://') || cell.v.includes('https://'))) {
                    var siteName = cell.v
                    siteName = siteName.replace('https://', '')
                        .replace('http://', '')
                        .replace('www.', '')
                        .split('/')[0];
                    const link = document.createElement('a');
                    link.href = cell.v;
                    // link.target = '_blank';
                    link.textContent = siteName;
                    // console.log('textContent: ' + siteName);
                    //.charAt(0).toUpperCase() + siteName.slice(1); // Capitalize the first letter
                    td.appendChild(link);
                }
                // time in office
                else if (index === 6) {
                    if (cell.v && cell.v.includes('Pres') || cell.v.includes('pres') || cell.v.includes('Current') || cell.v.includes('current')) {
                        td.style.backgroundColor = '#f9f977';
                    }
                    td.textContent = cell ? cell.v : '';
                }
                // crime
                else if (index === 3) {
                    td.style.fontWeight = 'bold';
                    td.textContent = cell ? cell.v : '';
                }
                // party
                else if (index === 2) {
                    td.style.backgroundColor = color;
                    td.style.color = textColour;
                    td.style.fontWeight = 'bold';
                    td.textContent = cell ? cell.v : '';
                }
                // Year of Charge/ Conviction
                else if (index === 4) {
                    td.textContent = cell ? cell.v : '';
                    console.log(td.textContent);
                }
                // politician name/picture
                else if (index === 0 && row.c[0]) {
                    // const imgCell = document.createElement('td');
                    const img = document.createElement('img');
                    var name = row.c[0].v
                    if (name) {
                        name = name.trim()
                    }
                    if (name && pics[name]) {
                        img.src = pics[name].trim();
                    }
                    else {
                        img.src = 'pics/no-image.jpg';
                    }
                    td.className = 'first-column';
                    td.textContent = cell ? cell.v : '';
                    td.style.fontWeight = 'bold';
                    td.appendChild(document.createElement('br'));
                    td.appendChild(img);
                    // newRow.appendChild(imgCell);
                }
                else {
                    td.textContent = cell ? cell.v : '';
                }
                tr.appendChild(td);
                // whole row party colour
                // tr.style.backgroundColor = color;
            });
            politicians[row.c[0].v] = politician
            document.getElementById('data-body').appendChild(tr);
        });

        createProvinceChart(politicians);
        createPartyChart(politicians);
    })
    .catch(error => console.error('Error fetching data:', error));



function filterTable() {
    const input = document.getElementById('search');
    const filter = input.value.toLowerCase();
    const rows = document.querySelectorAll('#data-body tr');

    rows.forEach(row => {
        const cells = row.getElementsByTagName('td');
        let rowVisible = false;

        for (let i = 0; i < cells.length; i++) {
            if (cells[i].textContent.toLowerCase().includes(filter)) {
                rowVisible = true;
                break;
            }
        }

        row.style.display = rowVisible ? '' : 'none';
    });
}

let originalOrder = []; // Array to store the original order of rows
let sortDirection = 'neutral';

// Function to sort the table by column
function sortTable(columnIndex) {
    const table = document.getElementById('data-table');
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const headerCells = table.querySelectorAll('thead th');

    // If originalOrder is empty, store the original order of the rows
    if (originalOrder.length === 0) {
        originalOrder = rows.map(row => row.cloneNode(true)); // Clone the original rows
    }

    // Clear all existing arrows from header cells
    headerCells.forEach(cell => {
        cell.innerHTML = cell.innerHTML.replace(/ ▲| ▼/g, ''); // Remove arrows if present
    });

    // Determine the current sort state for the clicked column
    if (sortDirection === 'neutral') {
        // First click, set to ascending
        sortDirection = 'asc';
    } else if (sortDirection === 'asc') {
        // Second click, set to descending
        sortDirection = 'desc';
    } else {
        // Third click, revert to original order
        sortDirection = 'neutral';

        // Clear the current rows and append the original order
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = ''; // Clear current rows
        originalOrder.forEach(row => tbody.appendChild(row.cloneNode(true))); // Append original rows
        return; // Exit after reverting to the original order
    }

    // Sort the rows based on the selected direction
    rows.sort((a, b) => {
        const cellA = a.cells[columnIndex].innerText.trim();
        const cellB = b.cells[columnIndex].innerText.trim();

        if (!isNaN(cellA) && !isNaN(cellB)) {
            // Sort numerically if both cells are numbers
            return sortDirection === 'asc' ? cellA - cellB : cellB - cellA;
        } else {
            // Sort alphabetically otherwise
            return sortDirection === 'asc' ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
        }
    });

    // Clear the current rows and append the sorted rows
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = ''; // Clear current rows
    rows.forEach(row => tbody.appendChild(row)); // Append sorted rows

    // Add the appropriate arrow to the sorted column, if not neutral
    const arrow = sortDirection === 'asc' ? ' ▲' : ' ▼';
    headerCells[columnIndex].innerHTML += arrow;
}

function getContrastingTextColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black for light colors and white for dark colors
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

function createProvinceChart(data) {
    const provinceCounts = {};

    console.log('creating province chart');

    document.getElementById('charts').style.display = 'flex';

    // Count crimes by province
    for (const politician in data) {
        const province = data[politician].Province;
        provinceCounts[province] = (provinceCounts[province] || 0) + 1;
    }

    const sortedProvinces = Object.entries(provinceCounts)
        .sort((a, b) => b[1] - a[1]); // Sort in descending order

    const provinces = sortedProvinces.map(entry => entry[0]);
    const counts = sortedProvinces.map(entry => entry[1]);

    // A color palette array for consistent, aesthetically pleasing colors
    const colorPalette = [
        'rgba(255, 99, 132, 0.6)',   // Soft red
        'rgba(54, 162, 235, 0.6)',   // Soft blue
        'rgba(255, 206, 86, 0.6)',   // Soft yellow
        'rgba(75, 192, 192, 0.6)',   // Soft teal
        'rgba(153, 102, 255, 0.6)',  // Soft purple
        'rgba(255, 159, 64, 0.6)'    // Soft orange
    ];

    // Repeat or slice the color palette to match the number of data points
    const backgroundColors = Array.from({ length: counts.length }, (_, i) => colorPalette[i % colorPalette.length]);


    const ctx = document.getElementById('provinceChart').getContext('2d');
    const provinceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: provinces,
            datasets: [{
                label: 'Number of Crimes',
                data: counts,
                // backgroundColor: 'rgba(75, 192, 192, 0.6)',
                backgroundColor: backgroundColors,
                borderColor: '#000000',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                },
                title: {
                    display: true,
                    text: 'Crimes by Province or Territory',
                    font: {
                        size: 20
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Crimes'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Province'
                    }
                }
            }
        }
    });
}

function createPartyChart(data) {
    const partyCounts = {};
    const partyColours = {};

    // Count crimes by party
    for (const i in data) {
        politician = data[i]
        var party = politician['partyCategories'][politician['partyCategories'].length - 1];
        if (party == undefined) {
            party = 'N/A'
        }
        party = party.replace(' Party', '')
        var pc = getPartyColours2(party)
        var c = pc[pc.length - 1]
        if (party === 'New Democratic') {
            party = 'NDP'
        }
        if (party == 'British Columbia Social Credit') {
            party = 'BC Social Credit'
        }
        partyColours[party] = c
        partyCounts[party] = (partyCounts[party] || 0) + 1;
    }

    const sortedParties = Object.entries(partyCounts)
        .sort((a, b) => b[1] - a[1]); // Sort in descending order

    const parties = sortedParties.map(entry => entry[0]);
    const counts = sortedParties.map(entry => entry[1]);
    const colours = sortedParties.map(entry => partyColours[entry[0]])

    const ctx = document.getElementById('partyChart').getContext('2d');
    const partyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: parties,
            datasets: [{
                label: 'Number of Crimes',
                data: counts,
                backgroundColor: colours,//'rgba(153, 102, 255, 0.6)',
                borderColor: '#000000',//'rgba(153, 102, 255, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                },
                title: {
                    display: true,
                    text: 'Crimes by Political Party',
                    font: {
                        size: 20
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Crimes'
                    },
                },
                x: {
                    title: {
                        display: true,
                        text: 'Party'
                    },
                }
            }
        },
        // plugins: [{
        //     beforeInit: function (chart) {
        //         chart.data.labels.forEach(function (label, index, labelsArr) {
        //             if (/\n/.test(label)) {
        //                 labelsArr[index] = label.split(/\n/)
        //             }
        //         })
        //     }
        // }]
    });
}

function downloadTable(format) {
    switch (format) {
        case 'csv':
            downloadCSV();
            break;
        case 'excel':
            downloadExcel();
            break;
        case 'pdf':
            downloadPDF();
            break;
    }
}

function downloadCSV() {
    const rows = document.querySelectorAll('#data-table tr');
    let csvContent = Array.from(rows).map(row => {
        const cells = row.querySelectorAll('th, td');
        return Array.from(cells).map(cell => cell.textContent).join(',');
    }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'data.csv';
    link.click();
}

function downloadExcel() {
    const table = document.getElementById('data-table');
    const workbook = XLSX.utils.table_to_book(table);
    const excelFile = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const blob = new Blob([excelFile], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'data.xlsx';
    link.click();
}

function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'pt', 'a4');

    pdf.text('Crimes by Canadian Politicians', 40, 40);

    pdf.autoTable({
        html: '#data-table',
        startY: 60,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });

    pdf.save('data.pdf');
}

// Helper function to convert an image URL to a Base64 string
function getImageAsBase64(url, callback) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        callback(dataURL);
    };
    img.src = url;
}

// Main function to download PDF with images
// function downloadPDF() {
//     const { jsPDF } = window.jspdf;
//     const pdf = new jsPDF('p', 'pt', 'a4');
//     pdf.text('Crimes by Canadian Politicians', 40, 40);

//     // Find the table and iterate over each row
//     const rows = [];
//     const table = document.getElementById('data-table');
//     const tableRows = table.querySelectorAll('tbody tr');

//     tableRows.forEach((row, rowIndex) => {
//         const cells = row.querySelectorAll('td');

//         // Assuming the first cell contains the image
//         const imgCell = cells[0].querySelector('img');
//         const imgUrl = imgCell ? imgCell.src : null;

//         // Convert the image to Base64 and add row data
//         if (imgUrl) {
//             getImageAsBase64(imgUrl, (imgBase64) => {
//                 const rowData = [imgBase64];

//                 // Add other cell data
//                 cells.forEach((cell, index) => {
//                     if (index > 0) rowData.push(cell.innerText);
//                 });

//                 // Fill row data with placeholder if image is missing
//                 rows[rowIndex] = rowData;

//                 // Generate PDF if all rows are populated
//                 if (rows.length === tableRows.length && rows.every(row => row)) {
//                     pdf.autoTable({
//                         head: [['Image', 'Name', 'Crime', 'Date']],
//                         body: rows.map(row => {
//                             return [
//                                 { content: '', styles: { cellWidth: 40, minCellHeight: 40 } },
//                                 ...row.slice(1)
//                             ];
//                         }),
//                         didDrawCell: (data) => {
//                             // Check for valid image data
//                             if (data.column.index === 0 && data.row.index < rows.length && rows[data.row.index][0]) {
//                                 const imgBase64 = rows[data.row.index][0];
//                                 pdf.addImage(imgBase64, 'PNG', data.cell.x + 2, data.cell.y + 2, 36, 36);
//                             }
//                         },
//                         startY: 60,
//                         styles: { fontSize: 8, cellPadding: 2 },
//                         headStyles: { fillColor: [41, 128, 185], textColor: 255 }
//                     });

//                     pdf.save('data_with_images.pdf');
//                 }
//             });
//         } else {
//             // Add placeholder for missing image and proceed
//             const rowData = [null];
//             cells.forEach((cell, index) => {
//                 if (index > 0) rowData.push(cell.innerText);
//             });
//             rows[rowIndex] = rowData;
//         }
//     });
// }

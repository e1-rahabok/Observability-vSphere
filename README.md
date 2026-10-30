# Observability vSphere

## Metrics

[vsphere-metrics.csv](vsphere-metrics.csv) lists the vCenter performance counters for each object type, one row per counter.

## Browser CSV viewer

The repository includes a simple browser-based CSV viewer that lets you:

- search across all columns
- filter by a selected column
- sort by clicking any column header
- show or hide columns

Open the site here:

- https://e1-rahabok.github.io/Observability-vSphere/

This is a lightweight spreadsheet-like view for the CSV, intended for quick inspection without installing Excel or another desktop app.

| Column | Meaning |
|---|---|
| Object Type | vSphere managed object type, for example Virtual Machine |
| Metric Group | Counter group, for example cpu, mem, disk, net |
| Metric Name | Counter name as the API returns it (`nameInfo.key`) |
| Rollup | Rollup type, for example average, latest, summation |
| Stats Type | Statistic type, for example rate, absolute, delta |
| Unit | Unit as the API returns it, for example percent, kiloBytes |
| Level | Collection level, as the API returns it (1 and 3 appear here) |
| Summary | Counter summary from the vCenter counter definition |

Source: `PerformanceManager.perfCounter` and `QueryAvailablePerfMetric`, from vCenter 9.1.0 (build 25370922). Counters are the union over every instance of each object type in that inventory.

### Object types without metrics in this list

- **vApp** (`vim.VirtualApp`) and **Datastore Cluster** (`vim.StoragePod`) are not in the CSV. The vCenter performance API returns counters per entity, so it can only report metrics for an object kind that exists in the inventory.

### Other notes

- vSAN performance entity types are documented separately in the Observability-vSAN repository and are not repeated here.
- Object types with no performance counters (Folder, Network, Distributed Port Group, Compute Resource) are not in the CSV.

import 'react-data-grid/lib/styles.css';

import { Component } from 'react';
import DataGrid, { Column, RenderRowProps, Row } from 'react-data-grid';
import { Cell } from 'react-table';

import { DataFrame, Field } from '@grafana/data';

import { TableNGProps } from '../types';

import { TableCellNG } from './Cells/TableCellNG';


interface TableRow {
  id: number;
  title: string;
  cell: Cell;
}

interface TableColumn extends Column<TableRow> {
  key: string;
  name: string;
  field: Omit<Field, "values">;
}



export class TableNG extends Component<TableNGProps> {



  mapFrameToDataGrid(main: DataFrame) {
    const columns: TableColumn[] = [];
    const rows: Array<{ [key: string]: string }> = [];

    main.fields.map((field) => {
      const key = field.name;
      const { values: _, ...shallowField } = field;

      // Add a column for each field
      columns.push({
        key, name: key, field: shallowField, renderCell: (props: any) => {
          const { row } = props;
          const value = row[key];

          console.log(shallowField);

          // Cell level rendering here
          return <TableCellNG
            key={key}
            value={value}
            field={shallowField}
          />
        }
      });

      // Create row objects
      field.values.map((value, index) => {
        const currentValue = { [key]: value };

        if (rows.length > index) {
          rows[index] = { ...rows[index], ...currentValue };
        } else {
          rows[index] = currentValue;
        }
      });
    });

    return {
      columns, rows
    }
  }


  render() {
    const { columns, rows } = this.mapFrameToDataGrid(this.props.data);

    return (
      <DataGrid
        rows={rows}
        columns={columns}
        defaultColumnOptions={{
          sortable: true,
          resizable: true,
          maxWidth: 200,
        }}
        renderers={{ renderRow: myRowRenderer }}
      />
    );
  }
}

function myRowRenderer(key: React.Key, props: RenderRowProps<Row>) {
  // Let's render row level things here!
  // i.e. we can look at row styles and such here
  return (
    <Row {...props} />
  );
}


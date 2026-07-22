import React from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel, Box,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { visuallyHidden } from '@mui/utils';

export const TableWrapper = styled('div')(({ theme }) => ({
  borderRadius: '20px',
  overflow: 'hidden',
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

export const DarkTable = styled(Table)(({ theme }) => ({
  borderCollapse: 'separate',
  borderSpacing: 0,
  backgroundColor: theme.palette.background.paper,
}));

export const DarkTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark'
    ? '#2a2a2a'
    : 'rgba(0, 132, 255, 0.08)',
}));

export const DarkTableCell = styled(TableCell)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
  fontSize: '14px',
  padding: '12px 16px',
  '&.MuiTableCell-head': {
    color: theme.palette.text.primary,
    fontWeight: 600,
    fontSize: '14px',
    letterSpacing: '0.5px',
  },
}));

export const DarkTableRow = styled(TableRow)(({ theme }) => ({
  transition: 'background-color 0.2s',
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.04)',
  },
  '&:last-child td': {
    borderBottom: 'none',
  },
}));

export const DarkTableBody = styled(TableBody)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
}));

export const FirstHeaderCell = styled(DarkTableCell)(({ theme }) => ({
  borderTopLeftRadius: '20px',
}));

export const ActionHeaderCell = styled(DarkTableCell)({
  width: 48,
  minWidth: 48,
  padding: 0,
});

export const LastHeaderCell = styled(DarkTableCell)(({ theme }) => ({
  borderTopRightRadius: '20px',
}));

export const TableContainer = styled('div')(({ theme }) => ({
  padding: '20px',
  backgroundColor: theme.palette.background.default,
}));

export const ReportTable = ({
  headers,
  children,
  loading,
  loadingComponent,
  sortable = false,
  sortConfig = null,
  onSort = null,
}) => {
  const renderHeader = (header, index) => {
    const isFirstColumn = index === 0;
    const isLastColumn = index === headers.length - 1;

    let CellComponent = DarkTableCell;
    if (isFirstColumn) {
      CellComponent = FirstHeaderCell;
    } else if (isLastColumn) {
      CellComponent = LastHeaderCell;
    }

    if (React.isValidElement(header)) {
      return <CellComponent key={index}>{header}</CellComponent>;
    }

    if (sortable && sortConfig && onSort && typeof header === 'object' && header !== null && header.sortKey) {
      const active = sortConfig.orderBy === header.sortKey;
      const direction = active ? sortConfig.order : 'asc';

      return (
        <CellComponent key={index}>
          <TableSortLabel
            active={active}
            direction={direction}
            onClick={() => onSort(header.sortKey)}
          >
            {header.label}
            {active && (
              <Box component="span" sx={visuallyHidden}>
                {direction === 'desc' ? 'sorted descending' : 'sorted ascending'}
              </Box>
            )}
          </TableSortLabel>
        </CellComponent>
      );
    }

    const headerText = typeof header === 'string' ? header : (header?.label || '');
    return <CellComponent key={index}>{headerText}</CellComponent>;
  };

  return (
    <TableContainer>
      <TableWrapper>
        <DarkTable>
          <DarkTableHead>
            <TableRow>
              {headers.map((header, index) => renderHeader(header, index))}
            </TableRow>
          </DarkTableHead>
          <DarkTableBody>
            {loading ? loadingComponent : children}
          </DarkTableBody>
        </DarkTable>
      </TableWrapper>
    </TableContainer>
  );
};

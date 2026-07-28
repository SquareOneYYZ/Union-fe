import React, { useRef, useState } from 'react';
import {
  Button, ButtonGroup, Menu, MenuItem, Typography,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const SplitButton = ({
  fullWidth, variant, color, disabled, onClick, options, selected, setSelected, sx,
}) => {
  const anchorRef = useRef();
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);

  return (
    <>
      <ButtonGroup fullWidth={fullWidth} variant={variant} color={color} ref={anchorRef} sx={{ borderRadius: '13px', ...sx }}>
        <Button disabled={disabled} onClick={() => onClick(selected)} sx={{ borderRadius: '13px 0 0 13px' }}>
          <Typography variant="button" noWrap>{options[selected]}</Typography>
        </Button>
        <Button fullWidth={false} size="small" onClick={() => setMenuAnchorEl(anchorRef.current)} sx={{ borderRadius: '13px 0 0 13px' }}>
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>
      <Menu
        open={!!menuAnchorEl}
        anchorEl={menuAnchorEl}
        onClose={() => setMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        {Object.entries(options).map(([key, value]) => (
          <MenuItem
            key={key}
            onClick={() => {
              setSelected(key);
              setMenuAnchorEl(null);
            }}
          >
            {value}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default SplitButton;

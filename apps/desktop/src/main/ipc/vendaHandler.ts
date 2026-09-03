import { ipcMain } from 'electron';
import { VendaService } from '../services/VendaService';

export function registerVendaHandlers() {
  ipcMain.handle('venda:registrar', async (_, payload) => {
    return await VendaService.efetuarVenda(payload);
  });
}

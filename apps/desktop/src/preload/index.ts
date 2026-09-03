import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  vendas: {
    registrar: (dados: any) => ipcRenderer.invoke('venda:registrar', dados),
  },
  caixa: {
    obterStatus: () => ipcRenderer.invoke('caixa:status'),
    abrir: (saldoInicial: number) => ipcRenderer.invoke('caixa:abrir', saldoInicial),
  }
});

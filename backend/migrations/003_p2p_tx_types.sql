-- Eliminamos la regla anterior que solo permitía DEPOSIT, PURCHASE, FEE
ALTER TABLE wallet_txs DROP CONSTRAINT wallet_txs_tx_type_check;

-- Creamos la nueva regla incluyendo los tipos para transferencias P2P
ALTER TABLE wallet_txs ADD CONSTRAINT wallet_txs_tx_type_check 
CHECK (tx_type IN ('DEPOSIT', 'PURCHASE', 'FEE', 'TRANSFER_OUT', 'TRANSFER_IN'));
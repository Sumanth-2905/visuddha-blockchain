package chaincode

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing an auction
type SmartContract struct {
	contractapi.Contract
}

// Auction describes basic details of what makes up a simple auction
type Auction struct {
	Type      string `json:"objectType"`
	Item      string `json:"item"`
	Price     int    `json:"price"`
	Seller    string `json:"seller"`
	State     string `json:"state"`
	Buyer     string `json:"buyer"`
	BidPrice  int    `json:"bidprice"`
	Bidder    string `json:"bidder"`
}

// CreateAuction adds a new auction to the world state with given details
func (s *SmartContract) CreateAuction(ctx contractapi.TransactionContextInterface, auctionID string, item string, price int) error {
	// Get ID of submitting client identity
	seller, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("failed to get client's ID: %v", err)
	}

	// Check if auction already exists
	exists, err := s.AuctionExists(ctx, auctionID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the auction %s already exists", auctionID)
	}

	// Create auction object
	auction := Auction{
		Type:     "auction",
		Item:     item,
		Price:    price,
		Seller:   seller,
		State:    "open",
	}

	auctionBytes, err := json.Marshal(auction)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(auctionID, auctionBytes)
}

// QueryAuction returns the auction stored in the world state with given id
func (s *SmartContract) QueryAuction(ctx contractapi.TransactionContextInterface, auctionID string) (*Auction, error) {
	auctionBytes, err := ctx.GetStub().GetState(auctionID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if auctionBytes == nil {
		return nil, fmt.Errorf("the auction %s does not exist", auctionID)
	}

	var auction Auction
	err = json.Unmarshal(auctionBytes, &auction)
	if err != nil {
		return nil, err
	}

	return &auction, nil
}

// SubmitBid places a bid for an open auction
func (s *SmartContract) SubmitBid(ctx contractapi.TransactionContextInterface, auctionID string, price int) error {
	// Get ID of submitting client identity
	bidder, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("failed to get client's ID: %v", err)
	}

	auction, err := s.QueryAuction(ctx, auctionID)
	if err != nil {
		return err
	}

	// Check that the auction is open
	if auction.State != "open" {
		return fmt.Errorf("the auction %s is not open", auctionID)
	}

	// The bid price must be greater than or equal to the asking price
	if price < auction.Price {
		return fmt.Errorf("the bid price %d is lower than the asking price %d", price, auction.Price)
	}

	// Update the auction to reflect the bid
	auction.State = "closed"
	auction.Buyer = bidder
	auction.BidPrice = price
	auction.Bidder = bidder

	auctionBytes, err := json.Marshal(auction)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(auctionID, auctionBytes)
}

// AuctionExists returns true when auction with given ID exists in world state
func (s *SmartContract) AuctionExists(ctx contractapi.TransactionContextInterface, auctionID string) (bool, error) {
	auctionBytes, err := ctx.GetStub().GetState(auctionID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return auctionBytes != nil, nil
}
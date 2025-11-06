import os

class MaxarFinder():
    
    def __init__(self):
         self.listOfDict:dict = {}
       
    
    # def kl():
    #     print('hello')
    
    def insertTiff(self,name:str,tifSrc:str)->None:
        self.listOfDict[name]["srcTif"]=tifSrc


    def insertShp(self,name:str,srcShp:str)->None:
        self.listOfDict[name]["srcShp"]=srcShp

    def insertXml(self,name:str,srcXml:str)->None:
        self.listOfDict[name]["srcXml"]=srcXml
    

    def findTiff(self,pathToSearch:str):
        for  root, dirs, files in  os.walk(pathToSearch):
            for file in files:
                new_file = file.lower()
                # print(new_file)
                if(new_file.endswith('_pixel_shape.shp') or new_file.endswith('.tif') or new_file.endswith('.tiff') or new_file.endswith('.xml') and not new_file.endswith('readme.xml')):
                    tif_name=''
                    if(new_file.endswith('_pixel_shape.shp')):
                        tif_name = new_file.removesuffix('_pixel_shape.shp')
                        print(tif_name,'tifname')
                    else:
                        tif_name = new_file[:new_file.find('.')]   
                        print(tif_name,'tif_name with point .') 
                    if ( not tif_name in self.listOfDict.keys()):
                        self.listOfDict[tif_name]={
                            "angle":0,
                            "srcTif":"",
                            "srcShp":"",
                            "srcXml":"",
                            "coordinate":"",
                            "date":"",
                            "bounder":""
                        }

                # if (self.listOfDict.get())
                #     self.listOfDict[file]
                
    def showAll(self):
        for i in self.listOfDict:
            print('this uique',i)
                
data = MaxarFinder()
data.findTiff(r'D:\Maxar')
print(data.showAll())
# .findTiff(r'L:\MAXAR')
